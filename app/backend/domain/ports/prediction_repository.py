"""Abstract repository for ML prediction results."""

from abc import ABC, abstractmethod
from uuid import UUID


class PredictionRepository(ABC):
    """Port defining ML prediction operations."""

    @abstractmethod
    async def save(self, prediction_data: dict) -> dict:
        """Persist a new prediction result."""

    @abstractmethod
    async def find_by_record_id(self, record_id: UUID) -> list[dict]:
        """Find all predictions for a given medical record."""

    @abstractmethod
    async def find_by_patient_id(self, patient_id: UUID) -> list[dict]:
        """Find all predictions for a patient, ordered by record date."""

    @abstractmethod
    async def find_latest_for_patients(
        self, patient_profile_ids: list[UUID]
    ) -> dict[UUID, dict]:
        """Return the single latest prediction for each of the given patient profile IDs.

        Patients with no predictions are absent from the returned dict.
        Result is keyed by patient_profile_id.
        """

    @abstractmethod
    async def count_all(self) -> int:
        """Return the total number of ML predictions across all records."""
