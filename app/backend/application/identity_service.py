"""Identity and authentication business logic."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi.security import OAuth2PasswordRequestForm

from api.routes.schemas.auth_schemas import PatientRegistrationRequest, SpecialistRegistrationRequest
from core.config import Settings
from core.exceptions import AppException, ForbiddenException, ValidationException
from core.security import create_access_token, verify_password, get_password_hash
from domain.ports.file_storage_port import FileStorage
from domain.ports.notification_service import NotificationService
from domain.ports.password_reset_token_repository import PasswordResetTokenRepository
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
        reset_token_repo: PasswordResetTokenRepository | None = None,
        notification_service: NotificationService | None = None,
        settings: Settings | None = None,
    ):
        self.user_repo = user_repo
        self.patient_repo = patient_repo
        self.specialist_repo = specialist_repo
        self.reset_token_repo = reset_token_repo
        self.notification_service = notification_service
        self.settings = settings

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

    async def request_password_reset(self, email: str, lang: str) -> None:
        """Issue a reset token and email the link; silent no-op on unknown/inactive user or rate limit."""
        user = await self.user_repo.get_by_email(email)
        if user is None or not user["is_active"]:
            return

        latest = await self.reset_token_repo.get_latest_unused_for_user(user["id"])
        if latest is not None and latest["created_at"] > datetime.now(timezone.utc) - timedelta(minutes=5):
            return

        raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        await self.reset_token_repo.create(user["id"], token_hash, expires_at)

        profile = await self.specialist_repo.get_by_user_id(user["id"])
        if profile is None:
            profile = await self.patient_repo.get_by_user_id(user["id"])
        first_name = profile["first_name"] if profile else ""

        reset_link = f"{self.settings.frontend_base_url}/reset-password?token={raw}"
        await self.notification_service.send_password_reset(user["email"], first_name, reset_link, lang)

    async def _resolve_valid_token(self, raw_token: str) -> dict | None:
        """Return the token row if it exists and is neither used nor expired, else None."""
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        row = await self.reset_token_repo.get_by_token_hash(token_hash)
        if row is None or row["used_at"] is not None or row["expires_at"] <= datetime.now(timezone.utc):
            return None
        return row

    async def verify_reset_token(self, raw_token: str) -> bool:
        """Return True if the raw token is currently valid (unused, unexpired)."""
        return (await self._resolve_valid_token(raw_token)) is not None

    async def reset_password(self, raw_token: str, new_password: str) -> None:
        """Set a new password for the token's user and consume the token."""
        row = await self._resolve_valid_token(raw_token)
        if row is None:
            raise ValidationException("Invalid or expired reset link.")
        await self.user_repo.update_password(row["user_id"], get_password_hash(new_password))
        await self.reset_token_repo.mark_used(row["id"])

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
