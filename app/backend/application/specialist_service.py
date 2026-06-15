"""Specialist profile business logic."""

import logging
from datetime import datetime
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile

from api.routes.schemas.specialist_schemas import SpecialistProfileUpdate
from core.config import get_settings
from core.exceptions import AppException
from domain.ports.specialist_repository import SpecialistRepository

logger = logging.getLogger(__name__)

_ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB

_GRADE_LABELS: dict[str, str] = {
    "REZIDENT": "Medic Rezident",
    "SPECIALIST": "Medic Specialist",
    "PRIMAR": "Medic Primar",
}


class SpecialistService:
    """Service handling specialist profile operations."""

    def __init__(self, specialist_repo: SpecialistRepository):
        self.specialist_repo = specialist_repo

    async def get_my_profile(self, user_id: UUID) -> dict:
        """Get the profile for the current user."""
        profile = await self.specialist_repo.get_by_user_id(user_id)
        if not profile:
            raise AppException(status_code=404, message="Specialist profile not found")
        return profile

    async def update_my_profile(self, user_id: UUID, update_data: SpecialistProfileUpdate) -> dict:
        """Update the profile for the current user."""
        updated_profile = await self.specialist_repo.update(
            user_id=user_id,
            update_data=update_data.model_dump(exclude_unset=True),
        )
        if not updated_profile:
            raise AppException(status_code=404, message="Specialist profile not found")
        return updated_profile

    async def upload_photo(self, user_id: UUID, file: UploadFile) -> str:
        """Validate, save, and register a profile photo; return the relative URL."""
        if file.content_type not in _ALLOWED_PHOTO_TYPES:
            raise AppException(
                status_code=400,
                message="Only JPEG, PNG, and WebP images are accepted",
            )

        content = await file.read()
        if len(content) > _MAX_PHOTO_BYTES:
            raise AppException(
                status_code=400,
                message="Photo must not exceed 5 MB",
            )

        settings = get_settings()
        photo_dir = Path(settings.upload_dir) / "profile_photos" / str(user_id)
        photo_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_name = Path(file.filename or "photo").name
        file_path = photo_dir / f"{timestamp}_{original_name}"
        file_path.write_bytes(content)

        relative_url = str(file_path.as_posix())
        await self.specialist_repo.set_photo_url(user_id, relative_url)
        logger.info("Saved profile photo for specialist %s at %s", user_id, relative_url)
        return relative_url

    async def delete_photo(self, user_id: UUID) -> None:
        """Clear the profile photo URL; the file on disk is not removed."""
        await self.specialist_repo.set_photo_url(user_id, None)

    async def update_extended_profile(self, user_id: UUID, payload: dict) -> dict:
        """Update non-credential profile fields and return the refreshed profile."""
        updated = await self.specialist_repo.update_extended_profile(user_id, payload)
        if not updated:
            raise AppException(status_code=404, message="Specialist profile not found")
        return updated

    async def request_reverification(self, user_id: UUID) -> dict:
        """Reset verification status to PENDING_VERIFICATION and return the refreshed profile."""
        profile = await self.specialist_repo.request_reverification(user_id)
        if not profile:
            raise AppException(status_code=404, message="Specialist profile not found")
        return profile

    async def get_public_profile(self, target_user_id: UUID) -> dict:
        """Return the profile only when the target specialist is APPROVED; raises 404 otherwise."""
        profile = await self.specialist_repo.get_public_profile(target_user_id)
        if not profile:
            raise AppException(status_code=404, message="Profile not found")
        return profile

    @staticmethod
    def compute_headline(profile: dict, latest_workplace: str | None) -> str:
        """Build the one-line display headline: specialization · grade · workplace."""
        parts: list[str] = []

        if specialization := profile.get("specialization"):
            parts.append(
                specialization.value if hasattr(specialization, "value") else str(specialization)
            )

        if grad := profile.get("grad_profesional"):
            grad_val = grad.value if hasattr(grad, "value") else str(grad)
            parts.append(_GRADE_LABELS.get(grad_val, grad_val))

        workplace = profile.get("unitate_sanitara") or latest_workplace
        if workplace:
            parts.append(workplace)

        return " · ".join(p for p in parts if p)
