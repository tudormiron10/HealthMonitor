"""Identity and authentication business logic."""

from uuid import UUID

from fastapi.security import OAuth2PasswordRequestForm

from api.routes.schemas.auth_schemas import PatientRegistrationRequest, SpecialistRegistrationRequest
from core.exceptions import AppException, ForbiddenException
from core.security import create_access_token, verify_password, get_password_hash
from domain.ports.file_storage_port import FileStorage
from domain.ports.user_repository import UserRepository
from domain.ports.patient_repository import PatientRepository
from domain.ports.specialist_repository import SpecialistRepository
from infrastructure.persistence.models.enums import UserRole, VerificationStatus


class IdentityService:
    """Service handling identity operations."""

    def __init__(
        self,
        user_repo: UserRepository,
        patient_repo: PatientRepository | None = None,
        specialist_repo: SpecialistRepository | None = None,
    ):
        self.user_repo = user_repo
        self.patient_repo = patient_repo
        self.specialist_repo = specialist_repo

    async def authenticate_user(self, form_data: OAuth2PasswordRequestForm) -> dict:
        """Authenticate user from login form data and generate tokens."""
        user = await self.user_repo.get_by_email(form_data.username)

        if not user:
            raise AppException(status_code=401, message="Incorrect email or password")

        if not verify_password(form_data.password, user["password_hash"]):
            raise AppException(status_code=401, message="Incorrect email or password")

        if not user["is_active"]:
            raise ForbiddenException("Acest cont a fost dezactivat.")

        access_token = create_access_token(subject=user["id"], role=user["role"].value)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": user["role"].value
        }

    async def register_patient(self, data: PatientRegistrationRequest) -> dict:
        """Register a new patient user and profile."""
        if await self.user_repo.get_by_email(data.email):
            raise AppException(status_code=400, message="Email already registered")

        user_data = {
            "email": data.email,
            "password_hash": get_password_hash(data.password),
            "role": UserRole.PATIENT
        }
        user = await self.user_repo.add(user_data)

        profile_data = {
            "user_id": user["id"],
            "first_name": data.first_name,
            "last_name": data.last_name,
            "date_of_birth": data.date_of_birth,
            "sex": data.sex
        }
        await self.patient_repo.add(profile_data)

        return {
            "message": "Patient registered successfully",
            "user_id": str(user["id"]),
            "role": user["role"].value
        }

    async def register_specialist(self, data: SpecialistRegistrationRequest) -> dict:
        """Register a new specialist user and profile, with pending verification."""
        if await self.user_repo.get_by_email(data.email):
            raise AppException(status_code=400, message="Email already registered")

        user_data = {
            "email": data.email,
            "password_hash": get_password_hash(data.password),
            "role": data.role,
            "verification_status": VerificationStatus.PENDING_VERIFICATION,
        }
        user = await self.user_repo.add(user_data)

        profile_data = {
            "user_id": user["id"],
            "first_name": data.first_name,
            "last_name": data.last_name,
            "specialization": data.specialization,
            "license_number": data.license_number,
            "clinic_affiliation": data.clinic_affiliation,
            "cod_parafa": data.cod_parafa,
            "unitate_sanitara": data.unitate_sanitara,
            "numar_ondr": data.numar_ondr,
            "institutie_absolvire": data.institutie_absolvire,
            "tip_certificare": data.tip_certificare,
            "numar_certificare": data.numar_certificare,
        }
        await self.specialist_repo.add(profile_data)

        access_token = create_access_token(subject=user["id"], role=data.role.value)
        return {
            "message": "Specialist registered successfully",
            "user_id": str(user["id"]),
            "role": user["role"].value,
            "access_token": access_token,
            "token_type": "bearer",
        }

    async def upload_verification_document(
        self, user_id: str, file_content: bytes, filename: str, storage: FileStorage
    ) -> dict:
        """Save a verification document and update the specialist profile."""
        document_url = await storage.save_verification_document(
            user_id=UUID(user_id),
            file_content=file_content,
            original_filename=filename,
        )
        await self.specialist_repo.update(UUID(user_id), {"verification_document_url": document_url})
        return {"document_url": document_url}
