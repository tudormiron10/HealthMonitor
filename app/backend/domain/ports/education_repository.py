"""Abstract repository for specialist education entries."""

from abc import ABC, abstractmethod
from uuid import UUID


class EducationRepository(ABC):
    """Port defining CRUD operations for specialist_education rows."""

    @abstractmethod
    async def add(self, specialist_profile_id: UUID, data: dict) -> dict:
        """Insert a new education entry and return the persisted row."""

    @abstractmethod
    async def list_for_specialist(self, specialist_profile_id: UUID) -> list[dict]:
        """Return all entries for a specialist ordered by display_order ASC, year_completed DESC."""

    @abstractmethod
    async def get_by_id(self, entry_id: UUID) -> dict | None:
        """Return a single education entry by its ID, or None if not found."""

    @abstractmethod
    async def update(self, entry_id: UUID, data: dict) -> dict | None:
        """Apply a partial update to an entry and return the refreshed row."""

    @abstractmethod
    async def delete(self, entry_id: UUID) -> bool:
        """Delete an entry; return True if a row was removed, False otherwise."""
