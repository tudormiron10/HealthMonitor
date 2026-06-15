"""Abstract repository for user identity access."""

from abc import ABC, abstractmethod
from uuid import UUID


class UserRepository(ABC):
    """Port defining user access operations."""

    @abstractmethod
    async def get_by_email(self, email: str) -> dict | None:
        """Find a user by their email address."""

    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> dict | None:
        """Find a user by their ID, regardless of is_active status."""

    @abstractmethod
    async def add(self, user_data: dict) -> dict:
        """Add a new user to the repository."""

    @abstractmethod
    async def list_all(
        self,
        role_filter: str | None,
        search_query: str | None,
        offset: int,
        limit: int,
        verification_status_filter: str | None = None,
    ) -> list[dict]:
        """List users with optional role, verification status, and search filters, paginated."""

    @abstractmethod
    async def count_users(
        self,
        role_filter: str | None,
        verification_status_filter: str | None,
    ) -> int:
        """Count users matching the given role and/or verification status filters."""

    @abstractmethod
    async def update_verification_status(self, user_id: UUID, status: str) -> None:
        """Update users.verification_status for a given user."""

    @abstractmethod
    async def set_active(self, user_id: UUID, is_active: bool) -> dict | None:
        """Set is_active for a user and return the updated user dict, or None if not found."""
