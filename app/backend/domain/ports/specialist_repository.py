"""Abstract repository for specialist data access."""

from abc import ABC, abstractmethod
from uuid import UUID


class SpecialistRepository(ABC):
    """Port defining specialist data operations."""

    @abstractmethod
    async def add(self, specialist_data: dict) -> dict:
        """Persist a new specialist profile."""

    @abstractmethod
    async def get_by_id(self, specialist_id: UUID) -> dict | None:
        """Find a specialist profile by its ID."""

    @abstractmethod
    async def get_by_user_id(self, user_id: UUID) -> dict | None:
        """Find a specialist profile by the associated user ID."""

    @abstractmethod
    async def update(self, user_id: UUID, update_data: dict) -> dict | None:
        """Update an existing specialist profile based on user ID."""

    @abstractmethod
    async def search(
        self,
        name: str | None,
        specialization: str | None,
        offset: int,
        limit: int,
    ) -> list[dict]:
        """Search profiles by name substring (first or last) and/or exact specialization."""

    @abstractmethod
    async def update_extended_profile(self, user_id: UUID, update_data: dict) -> dict | None:
        """Update non-credential extended profile fields for a specialist."""

    @abstractmethod
    async def set_photo_url(self, user_id: UUID, photo_url: str | None) -> None:
        """Set or clear the profile photo URL for a specialist."""

    @abstractmethod
    async def request_reverification(self, user_id: UUID) -> dict | None:
        """Reset verification state so the specialist re-enters the approval queue."""

    @abstractmethod
    async def get_public_profile(self, target_user_id: UUID) -> dict | None:
        """Return the full profile only when the target specialist is APPROVED."""
