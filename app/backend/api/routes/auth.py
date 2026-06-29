"""Authentication and Identity endpoints."""

import logging

from fastapi import APIRouter, Depends, File, Header, Request, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from uuid import UUID

from api.dependencies import get_current_user, get_db, get_file_storage, require_role
from domain.ports.file_storage_port import FileStorage
from api.routes.schemas.auth_schemas import (
    ForgotPasswordRequest,
    GenericMessageResponse,
    PatientRegistrationRequest,
    RegistrationResponse,
    ResetPasswordRequest,
    SpecialistRegistrationRequest,
    TokenVerifyResponse,
)
from application.identity_service import IdentityService
from application.specialist_service import SpecialistService
from core.config import get_settings
from core.exceptions import ValidationException
from infrastructure.notifications.email_service import EmailNotificationService
from infrastructure.persistence.models.enums import UserRole
from infrastructure.persistence.repositories.password_reset_token_repository import (
    SqlAlchemyPasswordResetTokenRepository,
)
from infrastructure.persistence.repositories.patient_repository import SqlAlchemyPatientRepository
from infrastructure.persistence.repositories.specialist_repository import SqlAlchemySpecialistRepository
from infrastructure.persistence.repositories.user_repository import SqlAlchemyUserRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_identity_service(db: AsyncSession = Depends(get_db)) -> IdentityService:
    """Dependency for injecting the IdentityService with its DB adapters."""
    user_repo = SqlAlchemyUserRepository(db)
    patient_repo = SqlAlchemyPatientRepository(db)
    specialist_repo = SqlAlchemySpecialistRepository(db)
    return IdentityService(
        user_repo,
        patient_repo,
        specialist_repo,
        reset_token_repo=SqlAlchemyPasswordResetTokenRepository(db),
        notification_service=EmailNotificationService(get_settings()),
        settings=get_settings(),
    )

@router.post("/register/patient", response_model=RegistrationResponse, status_code=201)
async def register_patient(
    data: PatientRegistrationRequest,
    identity_service: IdentityService = Depends(get_identity_service),
    db: AsyncSession = Depends(get_db)  
):
    """Register a new patient account."""
    result = await identity_service.register_patient(data)
    await db.commit() 
    return result

@router.post("/register/specialist", response_model=RegistrationResponse, status_code=201)
async def register_specialist(
    request: Request,
    data: SpecialistRegistrationRequest,
    identity_service: IdentityService = Depends(get_identity_service),
    db: AsyncSession = Depends(get_db)
):
    """Register a new specialist account."""
    result = await identity_service.register_specialist(data)
    await db.commit()

    try:
        user_repo = SqlAlchemyUserRepository(db)
        admins = await user_repo.list_all(
            role_filter="ADMIN", search_query=None, offset=0, limit=100
        )
        for admin in admins:
            await request.app.state.chat_manager.broadcast_to_user(
                admin["id"],
                {"type": "new_specialist_registered"},
            )
    except Exception:
        pass

    return result


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    identity_service: IdentityService = Depends(get_identity_service)
):
    """Authenticate a standard user via email and password."""
    return await identity_service.authenticate_user(form_data)


@router.post("/forgot-password", response_model=GenericMessageResponse, status_code=200)
async def forgot_password(
    data: ForgotPasswordRequest,
    identity_service: IdentityService = Depends(get_identity_service),
    db: AsyncSession = Depends(get_db),
    accept_language: str | None = Header(default=None),
):
    """Begin a password reset. Always returns a generic 200 (anti-enumeration)."""
    lang = "en" if (accept_language or "").lower().startswith("en") else "ro"
    try:
        await identity_service.request_password_reset(data.email, lang)
        await db.commit()
    except Exception:
        await db.rollback()
        logger.warning("Password reset request failed for %s", data.email, exc_info=True)
    return {"message": "If an account exists, a reset link has been sent."}


@router.get("/reset-password/verify", response_model=TokenVerifyResponse)
async def verify_reset_token(
    token: str,
    identity_service: IdentityService = Depends(get_identity_service),
):
    """Check whether a reset token is currently valid (unused, unexpired)."""
    return {"valid": await identity_service.verify_reset_token(token)}


@router.post("/reset-password", response_model=GenericMessageResponse, status_code=200)
async def reset_password(
    data: ResetPasswordRequest,
    identity_service: IdentityService = Depends(get_identity_service),
    db: AsyncSession = Depends(get_db),
):
    """Complete a password reset using a valid token."""
    await identity_service.reset_password(data.token, data.new_password)
    await db.commit()
    return {"message": "Password updated."}


_SPECIALIST_ROLES = [UserRole.DOCTOR, UserRole.NUTRITIONIST, UserRole.COACH]
_ALLOWED_DOCUMENT_TYPES = {"application/pdf", "image/jpeg", "image/png"}
_MAX_DOCUMENT_SIZE = 10 * 1024 * 1024


@router.post("/specialist/upload-verification-document")
async def upload_verification_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    identity_service: IdentityService = Depends(get_identity_service),
    storage: FileStorage = Depends(get_file_storage),
    db: AsyncSession = Depends(get_db),
):
    """Upload a verification document for the calling specialist's profile."""
    if file.content_type not in _ALLOWED_DOCUMENT_TYPES:
        raise ValidationException(
            f"Invalid file type: '{file.content_type}'. Allowed: PDF, JPEG, PNG."
        )

    file_content = await file.read()

    if len(file_content) > _MAX_DOCUMENT_SIZE:
        raise ValidationException("File too large. Maximum allowed size is 10 MB.")

    if len(file_content) == 0:
        raise ValidationException("Uploaded file is empty.")

    result = await identity_service.upload_verification_document(
        user_id=current_user["id"],
        file_content=file_content,
        filename=file.filename or "document",
        storage=storage,
    )
    await db.commit()
    return result


@router.get("/me")
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the context payload of the current logged-in user."""
    payload: dict = {"user_id": current_user["id"], "role": current_user["role"]}

    if current_user["role"] in [r.value for r in _SPECIALIST_ROLES]:
        profile = await SqlAlchemySpecialistRepository(db).get_by_user_id(
            UUID(current_user["id"])
        )
        if profile:
            payload["photo_url"] = profile.get("photo_url")
            payload["headline"] = SpecialistService.compute_headline(profile, None)

    return payload
