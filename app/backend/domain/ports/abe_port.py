"""Abstract port for the Attribute-Based Encryption authority."""

from abc import ABC, abstractmethod


class ABEAuthority(ABC):
    """Port for an attribute-based encryption authority."""

    @abstractmethod
    def setup(self) -> tuple[bytes, bytes]:
        """Generate fresh ``(master_public_key, master_secret_key)``."""

    @abstractmethod
    def generate_user_key(
        self, master_secret_key: bytes, attributes: list[str],
    ) -> bytes:
        """Issue a user key binding the listed attributes."""

    @abstractmethod
    def encrypt(
        self, master_public_key: bytes, plaintext: bytes, policy: str,
    ) -> bytes:
        """Encrypt plaintext under the access policy string."""

    @abstractmethod
    def decrypt(self, user_key: bytes, ciphertext: bytes) -> bytes:
        """Decrypt ciphertext; raises ``DecryptionFailedError`` on policy mismatch."""

    @property
    @abstractmethod
    def master_public_key(self) -> bytes:
        """The loaded master public key, used by encryption call sites."""

    @property
    @abstractmethod
    def master_secret_key(self) -> bytes:
        """The loaded master secret key, used for key issuance and owner reads."""
