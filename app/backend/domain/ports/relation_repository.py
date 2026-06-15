"""Abstract repository for patient-specialist relation data access."""

from abc import ABC, abstractmethod
from uuid import UUID


class RelationRepository(ABC):
    """Port defining patient-specialist relation operations."""

    @abstractmethod
    async def create(
        self,
        patient_user_id: UUID,
        specialist_user_id: UUID,
        initiated_by: str,
    ) -> dict:
        """Persist a new relation in PENDING status."""

    @abstractmethod
    async def get_by_id(self, relation_id: UUID) -> dict | None:
        """Find a relation by its primary key."""

    @abstractmethod
    async def update_status(self, relation_id: UUID, new_status: str) -> dict | None:
        """Update the status of an existing relation and return the updated row."""

    @abstractmethod
    async def find_existing_between(
        self,
        patient_user_id: UUID,
        specialist_user_id: UUID,
        statuses: list[str],
    ) -> dict | None:
        """Return the first relation matching the pair and any of the given statuses."""

    @abstractmethod
    async def list_for_user(
        self,
        user_id: UUID,
        role: str,
        statuses: list[str],
    ) -> list[dict]:
        """Return all relations for a user filtered by status."""

    @abstractmethod
    async def revoke_all_for_specialist(self, specialist_user_id: UUID) -> int:
        """Set all APPROVED relations for a specialist to REVOKED in one query."""

    @abstractmethod
    async def count_by_status(self, status: str) -> int:
        """Count relations matching the given status."""
