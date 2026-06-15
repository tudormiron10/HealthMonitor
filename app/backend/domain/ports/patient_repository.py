"""Abstract repository for patient data access."""

from abc import ABC, abstractmethod
from uuid import UUID


class PatientRepository(ABC):
    """Port defining patient data operations."""

    @abstractmethod
    async def add(self, patient_data: dict) -> dict:
        """Persist a new patient profile."""

    @abstractmethod
    async def get_by_id(self, patient_id: UUID) -> dict | None:
        """Find a patient profile by its ID."""

    @abstractmethod
    async def get_by_user_id(self, user_id: UUID) -> dict | None:
        """Find a patient profile by the associated user ID."""

    @abstractmethod
    async def update(self, user_id: UUID, update_data: dict) -> dict | None:
        """Update an existing patient profile based on user ID."""

    @abstractmethod
    async def get_many_by_user_ids(self, user_ids: list[UUID]) -> list[dict]:
        """Find all patient profiles whose user_id is in the given list.

        Returns an empty list when user_ids is empty.
        """
