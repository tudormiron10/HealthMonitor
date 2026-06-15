"""Abstract repository for medical records access."""

from abc import ABC, abstractmethod
from uuid import UUID


class RecordRepository(ABC):
    """Port defining medical record operations."""

    @abstractmethod
    async def save(self, record_data: dict) -> dict:
        """Persist a new medical record."""

    @abstractmethod
    async def find_by_id(self, record_id: UUID) -> dict | None:
        """Find a medical record by its ID."""

    @abstractmethod
    async def find_by_patient_id(self, patient_id: UUID) -> list[dict]:
        """Find all medical records for a patient, ordered by date."""

    @abstractmethod
    async def count_all(self) -> int:
        """Return the total number of medical records across all patients."""
