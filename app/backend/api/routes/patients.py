"""Patient Profile endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from api.dependencies import get_db, require_role
from api.routes.schemas.patient_schemas import PatientProfileRead, PatientProfileUpdate
from application.patient_service import PatientService
from infrastructure.persistence.models.enums import UserRole
from infrastructure.persistence.repositories.patient_repository import SqlAlchemyPatientRepository
from infrastructure.persistence.repositories.user_repository import SqlAlchemyUserRepository

router = APIRouter(prefix="/patients", tags=["Patients"])

_SPECIALIST_ROLES = [UserRole.DOCTOR, UserRole.NUTRITIONIST, UserRole.COACH]


def get_patient_service(db: AsyncSession = Depends(get_db)) -> PatientService:
    repo = SqlAlchemyPatientRepository(db)
    return PatientService(repo)


@router.get("/me", response_model=PatientProfileRead)
async def get_my_patient_profile(
    current_user: dict = Depends(require_role(UserRole.PATIENT)),
    patient_service: PatientService = Depends(get_patient_service),
):
    """Get the profile of currently logged-in patient."""
    return await patient_service.get_my_profile(current_user["id"])


@router.put("/me", response_model=PatientProfileRead)
async def update_my_patient_profile(
    update_data: PatientProfileUpdate,
    current_user: dict = Depends(require_role(UserRole.PATIENT)),
    patient_service: PatientService = Depends(get_patient_service),
    db: AsyncSession = Depends(get_db),
):
    """Update profile details for currently logged-in patient."""
    result = await patient_service.update_my_profile(current_user["id"], update_data)
    await db.commit()
    return result


@router.get("/search", response_model=list[PatientProfileRead])
async def search_patients(
    email: str = Query(..., description="Exact email address to look up"),
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Find a patient by exact email address. Returns [] when no match; never raises 404."""
    user = await SqlAlchemyUserRepository(db).get_by_email(email)
    if user is None or user["role"] != UserRole.PATIENT and user["role"] != UserRole.PATIENT.value:
        return []

    profile = await SqlAlchemyPatientRepository(db).get_by_user_id(user["id"])
    if profile is None:
        return []

    return [profile]
