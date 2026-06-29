"""Abstract repository for password reset tokens."""

from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID


class PasswordResetTokenRepository(ABC):
    """Port defining password reset token persistence operations."""

    @abstractmethod
    async def create(self, user_id: UUID, token_hash: str, expires_at: datetime) -> dict:
        """Persist a new reset token row and return it."""

    @abstractmethod
    async def get_by_token_hash(self, token_hash: str) -> dict | None:
        """Return the token row matching the given SHA-256 hash, or None."""

    @abstractmethod
    async def get_latest_unused_for_user(self, user_id: UUID) -> dict | None:
        """Return the user's most recent token where used_at IS NULL, or None."""

    @abstractmethod
    async def mark_used(self, token_id: UUID) -> None:
        """Mark a token as consumed by setting used_at to the current time."""
