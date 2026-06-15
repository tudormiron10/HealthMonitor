"""Concrete ABEAuthority adapter backed by the fallback CP-ABE simulation."""

from pathlib import Path

from domain.ports.abe_port import ABEAuthority
from infrastructure.crypto import (
    decrypt as _decrypt,
    encrypt as _encrypt,
    generate_user_key as _generate_user_key,
    setup as _setup,
)


class ConcreteABEAuthority(ABEAuthority):
    """Concrete implementation of the ABEAuthority interface."""

    def __init__(self, master_public_key: bytes, master_secret_key: bytes):
        self._mpk = master_public_key
        self._msk = master_secret_key

    @classmethod
    def from_paths(
        cls, public_key_path: Path, secret_key_path: Path,
    ) -> "ConcreteABEAuthority":
        """Load master keys from disk; generate and persist them on first call."""
        if public_key_path.exists() and secret_key_path.exists():
            mpk = public_key_path.read_bytes()
            msk = secret_key_path.read_bytes()
            return cls(mpk, msk)

        mpk, msk = _setup()
        public_key_path.parent.mkdir(parents=True, exist_ok=True)
        secret_key_path.parent.mkdir(parents=True, exist_ok=True)
        public_key_path.write_bytes(mpk)
        secret_key_path.write_bytes(msk)
        return cls(mpk, msk)

    def setup(self) -> tuple[bytes, bytes]:
        return _setup()

    def generate_user_key(
        self, master_secret_key: bytes, attributes: list[str],
    ) -> bytes:
        return _generate_user_key(master_secret_key, attributes)

    def encrypt(
        self, master_public_key: bytes, plaintext: bytes, policy: str,
    ) -> bytes:
        return _encrypt(master_public_key, plaintext, policy)

    def decrypt(self, user_key: bytes, ciphertext: bytes) -> bytes:
        return _decrypt(user_key, ciphertext)

    @property
    def master_public_key(self) -> bytes:
        return self._mpk

    @property
    def master_secret_key(self) -> bytes:
        return self._msk
