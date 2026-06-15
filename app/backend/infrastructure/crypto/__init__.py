"""Crypto adapters — Attribute-Based Encryption (ABE) implementation.

Scheme overview:
* Attribute keys are deterministic: ``attr_key = HMAC-SHA256(msk, attribute)``
* Each ciphertext seals a fresh 32-byte content-encryption key (CEK)
  with AES-256-GCM. The CEK itself is wrapped along the policy's
  access tree:
    - At an attribute leaf, the CEK fragment is sealed with the
      attribute's HMAC-derived key (AES-256-GCM).
    - At an ``OR`` node, the same fragment is sealed once per child;
      decryption succeeds when any one child unwraps it.
    - At an ``AND`` node, the fragment is XOR-split into one random
      share per child; decryption requires unwrapping every share.

* Patient scoping is enforced by including ``AND patient:<uuid>`` in
  every policy. A user key issued for patient A cannot satisfy the
  ``patient:`` leaf for patient B, so even a specialist with the
  right ``spec:*`` attribute cannot cross patient boundaries.
* The authority (server) holds the master secret and decrypts on the
  patient-owner read path by reconstructing any required attribute
  key on demand."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import secrets
from dataclasses import dataclass
from typing import Union

from Crypto.Cipher import AES

from core.exceptions import DecryptionFailedError


__all__ = [
    "DecryptionFailedError",
    "setup",
    "generate_user_key",
    "encrypt",
    "decrypt",
]

@dataclass(frozen=True)
class _AttrNode:
    attribute: str


@dataclass(frozen=True)
class _OrNode:
    children: tuple


@dataclass(frozen=True)
class _AndNode:
    children: tuple


_PolicyNode = Union[_AttrNode, _OrNode, _AndNode]

_TOKEN_RE = re.compile(r"\(|\)|\bAND\b|\bOR\b|[A-Za-z][A-Za-z0-9_:\-]*")


def _tokenize(policy: str) -> list[str]:
    tokens = _TOKEN_RE.findall(policy)
    if not tokens:
        raise ValueError(f"Empty or invalid policy: {policy!r}")
    return tokens


class _Parser:
    """Recursive-descent parser for policy strings.

    Grammar:
        expr     := or_expr
        or_expr  := and_expr ("OR" and_expr)*
        and_expr := atom ("AND" atom)*
        atom     := "(" expr ")" | ATTRIBUTE
    """

    def __init__(self, tokens: list[str]):
        self._tokens = tokens
        self._pos = 0

    def parse(self) -> _PolicyNode:
        node = self._parse_or()
        if self._pos != len(self._tokens):
            raise ValueError(
                f"Unexpected trailing tokens: {self._tokens[self._pos:]!r}"
            )
        return node

    def _peek(self) -> str | None:
        return self._tokens[self._pos] if self._pos < len(self._tokens) else None

    def _consume(self) -> str:
        token = self._tokens[self._pos]
        self._pos += 1
        return token

    def _parse_or(self) -> _PolicyNode:
        children = [self._parse_and()]
        while self._peek() == "OR":
            self._consume()
            children.append(self._parse_and())
        return children[0] if len(children) == 1 else _OrNode(tuple(children))

    def _parse_and(self) -> _PolicyNode:
        children = [self._parse_atom()]
        while self._peek() == "AND":
            self._consume()
            children.append(self._parse_atom())
        return children[0] if len(children) == 1 else _AndNode(tuple(children))

    def _parse_atom(self) -> _PolicyNode:
        token = self._peek()
        if token is None:
            raise ValueError("Unexpected end of policy")
        if token == "(":
            self._consume()
            node = self._parse_or()
            if self._peek() != ")":
                raise ValueError(f"Expected ')', got {self._peek()!r}")
            self._consume()
            return node
        if token in ("AND", "OR", ")"):
            raise ValueError(f"Unexpected token {token!r}")
        self._consume()
        return _AttrNode(token)


def _parse_policy(policy: str) -> _PolicyNode:
    return _Parser(_tokenize(policy)).parse()

"""Cryptographic primitives"""

_KEY_LEN = 32
_NONCE_LEN = 12
_TAG_LEN = 16
_VERSION = 1


def _derive_attr_key(master_secret: bytes, attribute: str) -> bytes:
    return hmac.new(master_secret, attribute.encode("utf-8"), hashlib.sha256).digest()


def _aes_gcm_seal(key: bytes, plaintext: bytes) -> bytes:
    nonce = secrets.token_bytes(_NONCE_LEN)
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    ct, tag = cipher.encrypt_and_digest(plaintext)
    return nonce + tag + ct


def _aes_gcm_open(key: bytes, blob: bytes) -> bytes:
    if len(blob) < _NONCE_LEN + _TAG_LEN:
        raise DecryptionFailedError("ciphertext too short")
    nonce = blob[:_NONCE_LEN]
    tag = blob[_NONCE_LEN:_NONCE_LEN + _TAG_LEN]
    ct = blob[_NONCE_LEN + _TAG_LEN:]
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    try:
        return cipher.decrypt_and_verify(ct, tag)
    except ValueError as exc:
        raise DecryptionFailedError("AES-GCM verification failed") from exc


def _xor_bytes(*chunks: bytes) -> bytes:
    if not chunks:
        return b""
    length = len(chunks[0])
    if any(len(c) != length for c in chunks):
        raise ValueError("XOR chunks must be equal length")
    out = bytearray(length)
    for chunk in chunks:
        for i, byte in enumerate(chunk):
            out[i] ^= byte
    return bytes(out)


"""Access-tree wrapping / unwrapping"""

def _wrap_along_tree(node: _PolicyNode, payload: bytes, master_secret: bytes) -> dict:
    """Recursively wrap the payload along the access tree with attribute keys."""
    if isinstance(node, _AttrNode):
        attr_key = _derive_attr_key(master_secret, node.attribute)
        sealed = _aes_gcm_seal(attr_key, payload)
        return {
            "type": "attr",
            "attribute": node.attribute,
            "wrapped": base64.b64encode(sealed).decode("ascii"),
        }
    if isinstance(node, _OrNode):
        return {
            "type": "or",
            "branches": [
                _wrap_along_tree(child, payload, master_secret)
                for child in node.children
            ],
        }
    if isinstance(node, _AndNode):
        n = len(node.children)
        random_shares = [secrets.token_bytes(len(payload)) for _ in range(n - 1)]
        last_share = _xor_bytes(payload, *random_shares)
        shares = random_shares + [last_share]
        return {
            "type": "and",
            "branches": [
                _wrap_along_tree(child, share, master_secret)
                for child, share in zip(node.children, shares)
            ],
        }
    raise TypeError(f"Unknown node type: {type(node).__name__}")


def _unwrap_along_tree(tree: dict, user_attr_keys: dict[str, bytes]) -> bytes:
    """Recursively unwrap the payload along the access tree with user attribute keys."""
    node_type = tree.get("type")
    if node_type == "attr":
        attribute = tree["attribute"]
        key = user_attr_keys.get(attribute)
        if key is None:
            raise DecryptionFailedError(f"missing attribute key: {attribute}")
        blob = base64.b64decode(tree["wrapped"])
        return _aes_gcm_open(key, blob)
    if node_type == "or":
        last_exc: DecryptionFailedError | None = None
        for branch in tree["branches"]:
            try:
                return _unwrap_along_tree(branch, user_attr_keys)
            except DecryptionFailedError as exc:
                last_exc = exc
        raise DecryptionFailedError("no OR branch satisfied") from last_exc
    if node_type == "and":
        shares = [
            _unwrap_along_tree(branch, user_attr_keys)
            for branch in tree["branches"]
        ]
        return _xor_bytes(*shares)
    raise DecryptionFailedError(f"unknown node type in ciphertext: {node_type!r}")

"""Public API — the four primitives"""

def setup() -> tuple[bytes, bytes]:
    """Generate ``(master_public_key, master_secret_key)`` for the authority."""
    master_secret = secrets.token_bytes(_KEY_LEN)
    return master_secret, master_secret


def generate_user_key(master_secret_key: bytes, attributes: list[str]) -> bytes:
    """Issue a user key binding the listed attributes."""
    if len(master_secret_key) != _KEY_LEN:
        raise ValueError("master_secret_key must be 32 bytes")
    attr_map = {
        attribute: base64.b64encode(
            _derive_attr_key(master_secret_key, attribute)
        ).decode("ascii")
        for attribute in attributes
    }
    payload = {"version": _VERSION, "attributes": attr_map}
    return json.dumps(payload, separators=(",", ":")).encode("utf-8")


def encrypt(master_public_key: bytes, plaintext: bytes, policy: str) -> bytes:
    """Encrypt ``plaintext`` under the access ``policy``.

    The policy grammar supports ``AND``, ``OR``, parentheses, and
    attribute atoms of the form ``name:value`` (e.g. ``spec:CARDIOLOGIE``,
    ``patient:550e8400-e29b-41d4-a716-446655440000``, ``marker:hba1c``).
    """
    if len(master_public_key) != _KEY_LEN:
        raise ValueError("master_public_key must be 32 bytes")
    tree = _parse_policy(policy)
    cek = secrets.token_bytes(_KEY_LEN)
    sealed_payload = _aes_gcm_seal(cek, plaintext)
    wrapped_cek = _wrap_along_tree(tree, cek, master_public_key)
    envelope = {
        "version": _VERSION,
        "policy": policy,
        "payload": base64.b64encode(sealed_payload).decode("ascii"),
        "wrapped_cek": wrapped_cek,
    }
    return json.dumps(envelope, separators=(",", ":")).encode("utf-8")


def decrypt(user_key: bytes, ciphertext: bytes) -> bytes:
    """Decrypt ``ciphertext`` with ``user_key``."""
    try:
        key_payload = json.loads(user_key.decode("utf-8"))
        envelope = json.loads(ciphertext.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise DecryptionFailedError("malformed user key or ciphertext") from exc
    if key_payload.get("version") != _VERSION or envelope.get("version") != _VERSION:
        raise DecryptionFailedError("unsupported version")
    user_attr_keys = {
        attribute: base64.b64decode(b64_key)
        for attribute, b64_key in key_payload["attributes"].items()
    }
    cek = _unwrap_along_tree(envelope["wrapped_cek"], user_attr_keys)
    sealed_payload = base64.b64decode(envelope["payload"])
    return _aes_gcm_open(cek, sealed_payload)
