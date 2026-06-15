"""Patient profile business logic."""

from uuid import UUID

from api.routes.schemas.patient_schemas import PatientProfileUpdate
from core.exceptions import AppException
from domain.ports.patient_repository import PatientRepository


class PatientService:
    """Service handling patient profile operations."""

    def __init__(self, patient_repo: PatientRepository):
        self.patient_repo = patient_repo

    async def get_my_profile(self, user_id: UUID) -> dict:
        """Get the profile for the current user."""
        profile = await self.patient_repo.get_by_user_id(user_id)
        if not profile:
            raise AppException(status_code=404, message="Patient profile not found")
        return profile

    async def update_my_profile(self, user_id: UUID, update_data: PatientProfileUpdate) -> dict:
        """Update the profile for the current user."""
        updated_profile = await self.patient_repo.update(
            user_id=user_id,
            update_data=update_data.model_dump(exclude_unset=True)
        )
        if not updated_profile:
            raise AppException(status_code=404, message="Patient profile not found")
        return updated_profile
