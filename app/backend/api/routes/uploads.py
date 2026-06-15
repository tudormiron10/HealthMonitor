"""Authenticated serving of uploaded documents."""

import logging
import mimetypes
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from api.dependencies import get_current_user, get_db
from core.config import get_settings
from core.exceptions import ForbiddenException, NotFoundException
from infrastructure.persistence.models.enums import RelationStatus, UserRole
from infrastructure.persistence.repositories.patient_repository import SqlAlchemyPatientRepository
from infrastructure.persistence.repositories.relation_repository import SqlAlchemyRelationRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/uploads", tags=["Uploads"])

_SPECIALIST_ROLES = {UserRole.DOCTOR.value, UserRole.NUTRITIONIST.value, UserRole.COACH.value}


@router.get("/{file_path:path}")
async def get_upload(
    file_path: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Serve an uploaded document if the caller is authorized for it.
    Returns 403 when unauthorized, 404 when missing."""
    base_dir = Path(get_settings().upload_dir).resolve()
    target = (base_dir / file_path).resolve()

    if base_dir not in target.parents:
        raise NotFoundException("File", file_path)

    segments = [s for s in file_path.split("/") if s]
    if len(segments) < 2:
        raise NotFoundException("File", file_path)

    category = segments[0]
    role = current_user["role"]
    user_id = current_user["id"]

    if category == "verification_documents":
        owner_user_id = segments[1]
        if role != UserRole.ADMIN.value and str(user_id) != owner_user_id:
            raise ForbiddenException("You are not authorized to access this document.")
    elif category == "profile_photos":
        raise NotFoundException("File", file_path)
    else:
        try:
            patient_profile_id = UUID(category)
        except ValueError:
            raise NotFoundException("File", file_path)

        profile = await SqlAlchemyPatientRepository(db).get_by_id(patient_profile_id)
        if profile is None:
            raise NotFoundException("File", file_path)
        patient_user_id = profile["user_id"]

        if role == UserRole.PATIENT.value:
            if str(user_id) != str(patient_user_id):
                raise ForbiddenException("You are not authorized to access this document.")
        elif role in _SPECIALIST_ROLES:
            relation = await SqlAlchemyRelationRepository(db).find_existing_between(
                patient_user_id=patient_user_id,
                specialist_user_id=UUID(user_id),
                statuses=[RelationStatus.APPROVED],
            )
            if relation is None:
                raise ForbiddenException("No approved relation exists with this patient.")
        else:
            raise ForbiddenException("You are not authorized to access this document.")

    if not target.is_file():
        raise NotFoundException("File", file_path)

    media_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
    return FileResponse(
        path=str(target),
        media_type=media_type,
        filename=target.name,
        content_disposition_type="inline",
    )
