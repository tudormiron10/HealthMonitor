"""Shared FastAPI dependencies for dependency injection.

Dependencies defined here are injected into route handlers via
FastAPI's Depends() mechanism. This is the wiring point where
abstract ports meet concrete adapters.
"""

from uuid import UUID

from fastapi import Depends, Request
from jose import JWTError, jwt # type: ignore
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from core.config import Settings, get_settings
from core.exceptions import AppException, ForbiddenException, NotFoundException
from infrastructure.persistence.database import get_db as _get_db
from infrastructure.persistence.models.enums import RelationStatus, UserRole

def get_config(settings: Settings = Depends(get_settings)) -> Settings:
    """Inject application settings into route handlers."""
    return settings


async def get_db(session: AsyncSession = Depends(_get_db)) -> AsyncSession:
    """Inject async database session into route handlers."""
    return session


# OAuth2 scheme configures Swagger UI to send the token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Decode JWT token and return the current user's payload."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        user_id: str | None = payload.get("sub")
        role: str | None = payload.get("role")

        if user_id is None or role is None:
            raise AppException(status_code=401, message="Invalid authentication token")

        return {"id": user_id, "role": role}

    except JWTError:
        raise AppException(status_code=401, message="Invalid authentication token")


def require_role(allowed_roles: list[UserRole] | UserRole):
    """Closure validating if the user has one of the allowed roles."""
    if not isinstance(allowed_roles, list):
        allowed_roles = [allowed_roles]

    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in [r.value for r in allowed_roles]:
            raise AppException(
                status_code=403,
                message=f"Access denied. Requires one of: {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker


_SPECIALIST_ROLES = [UserRole.DOCTOR, UserRole.NUTRITIONIST, UserRole.COACH]


def get_work_experience_service(db: AsyncSession = Depends(get_db)):
    """Wire WorkExperienceService with its repositories."""
    from application.work_experience_service import WorkExperienceService
    from infrastructure.persistence.repositories.specialist_repository import SqlAlchemySpecialistRepository
    from infrastructure.persistence.repositories.work_experience_repository import SqlAlchemyWorkExperienceRepository

    return WorkExperienceService(
        repo=SqlAlchemyWorkExperienceRepository(db),
        specialist_repo=SqlAlchemySpecialistRepository(db),
    )


def get_education_service(db: AsyncSession = Depends(get_db)):
    """Wire EducationService with its repositories."""
    from application.education_service import EducationService
    from infrastructure.persistence.repositories.education_repository import SqlAlchemyEducationRepository
    from infrastructure.persistence.repositories.specialist_repository import SqlAlchemySpecialistRepository

    return EducationService(
        repo=SqlAlchemyEducationRepository(db),
        specialist_repo=SqlAlchemySpecialistRepository(db),
    )


def get_certification_service(db: AsyncSession = Depends(get_db)):
    """Wire CertificationService with its repositories."""
    from application.certification_service import CertificationService
    from infrastructure.persistence.repositories.certification_repository import SqlAlchemyCertificationRepository
    from infrastructure.persistence.repositories.specialist_repository import SqlAlchemySpecialistRepository

    return CertificationService(
        repo=SqlAlchemyCertificationRepository(db),
        specialist_repo=SqlAlchemySpecialistRepository(db),
    )


def get_pdf_parser():
    """Wire the concrete PDF parser adapter behind the PdfParser port."""
    from infrastructure.parsing.pdfplumber_parser import PdfPlumberParser

    return PdfPlumberParser()


def get_file_storage():
    """Wire the concrete file-storage adapter behind the FileStorage port."""
    from infrastructure.storage.local_file_storage import LocalFileStorage

    return LocalFileStorage()


def get_chat_connection_manager(request: Request):
    """Return the shared in-memory WebSocket connection manager from app state."""
    return request.app.state.chat_manager


def get_abe_authority(request: Request):
    """Return the ABEAuthority instance from app state."""
    return request.app.state.abe_authority


def get_conversation_service(db: AsyncSession = Depends(get_db)):
    """Wire ConversationService with its repositories."""
    from application.conversation_service import ConversationService
    from infrastructure.persistence.repositories.conversation_repository import SqlAlchemyConversationRepository
    from infrastructure.persistence.repositories.message_repository import SqlAlchemyMessageRepository
    from infrastructure.persistence.repositories.relation_repository import SqlAlchemyRelationRepository
    from infrastructure.persistence.repositories.user_repository import SqlAlchemyUserRepository

    return ConversationService(
        conversation_repo=SqlAlchemyConversationRepository(db),
        relation_repo=SqlAlchemyRelationRepository(db),
        user_repo=SqlAlchemyUserRepository(db),
        message_repo=SqlAlchemyMessageRepository(db),
    )


def get_chat_service(db: AsyncSession = Depends(get_db)):
    """Wire ChatService with its repositories and ConversationService."""
    from application.chat_service import ChatService
    from infrastructure.persistence.repositories.message_repository import SqlAlchemyMessageRepository

    conv_service = get_conversation_service(db)
    return ChatService(
        message_repo=SqlAlchemyMessageRepository(db),
        conversation_service=conv_service,
    )


def get_notification_service(request: Request, db: AsyncSession = Depends(get_db)):
    """Wire NotificationService with its dependencies."""
    from application.chat_service import ChatService
    from application.conversation_service import ConversationService
    from application.notification_service import NotificationService
    from infrastructure.persistence.repositories.conversation_repository import SqlAlchemyConversationRepository
    from infrastructure.persistence.repositories.message_repository import SqlAlchemyMessageRepository
    from infrastructure.persistence.repositories.relation_repository import SqlAlchemyRelationRepository
    from infrastructure.persistence.repositories.user_repository import SqlAlchemyUserRepository

    msg_repo = SqlAlchemyMessageRepository(db)
    conv_service = ConversationService(
        conversation_repo=SqlAlchemyConversationRepository(db),
        relation_repo=SqlAlchemyRelationRepository(db),
        user_repo=SqlAlchemyUserRepository(db),
        message_repo=msg_repo,
    )
    return NotificationService(
        relation_repo=SqlAlchemyRelationRepository(db),
        conversation_service=conv_service,
        chat_service=ChatService(message_repo=msg_repo, conversation_service=conv_service),
        chat_manager=request.app.state.chat_manager,
    )


async def require_active_relation_for_patient(
    patient_user_id: UUID,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Assert an APPROVED relation between the calling specialist and the given patient."""
    from infrastructure.persistence.repositories.patient_repository import SqlAlchemyPatientRepository
    from infrastructure.persistence.repositories.relation_repository import SqlAlchemyRelationRepository

    specialist_user_id = UUID(current_user["id"])

    relation = await SqlAlchemyRelationRepository(db).find_existing_between(
        patient_user_id=patient_user_id,
        specialist_user_id=specialist_user_id,
        statuses=[RelationStatus.APPROVED],
    )
    if relation is None:
        raise ForbiddenException(
            "No approved relation exists between you and this patient."
        )

    patient_profile = await SqlAlchemyPatientRepository(db).get_by_user_id(patient_user_id)
    if patient_profile is None:
        raise NotFoundException("Patient profile", str(patient_user_id))

    return {
        "patient_profile": patient_profile,
        "specialist_user_id": specialist_user_id,
    }
