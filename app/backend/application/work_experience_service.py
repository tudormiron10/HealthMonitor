"""Work experience entry business logic."""

from uuid import UUID

from core.exceptions import AppException
from domain.ports.specialist_repository import SpecialistRepository
from domain.ports.work_experience_repository import WorkExperienceRepository


def _validate(payload: dict) -> None:
    start = payload.get("start_date")
    end = payload.get("end_date")
    if start and end and end < start:
        raise AppException(status_code=400, message="end_date must be on or after start_date")


class WorkExperienceService:
    """Service handling CRUD for specialist work experience entries."""

    def __init__(
        self,
        repo: WorkExperienceRepository,
        specialist_repo: SpecialistRepository,
    ):
        self.repo = repo
        self.specialist_repo = specialist_repo

    async def _resolve_profile_id(self, user_id: UUID) -> UUID:
        """Helper to get specialist profile ID from user ID, ensuring the user is a specialist."""
        profile = await self.specialist_repo.get_by_user_id(user_id)
        if not profile:
            raise AppException(status_code=404, message="Specialist profile not found")
        return profile["id"]

    async def list_mine(self, user_id: UUID) -> list[dict]:
        """Return all work experience entries for the calling specialist."""
        profile_id = await self._resolve_profile_id(user_id)
        return await self.repo.list_for_specialist(profile_id)

    async def add_mine(self, user_id: UUID, payload: dict) -> dict:
        """Add a new work experience entry for the calling specialist."""
        profile_id = await self._resolve_profile_id(user_id)
        _validate(payload)
        return await self.repo.add(profile_id, payload)

    async def update_mine(self, user_id: UUID, entry_id: UUID, payload: dict) -> dict:
        """Update an existing entry; enforces ownership and date ordering."""
        profile_id = await self._resolve_profile_id(user_id)

        entry = await self.repo.get_by_id(entry_id)
        if not entry:
            raise AppException(status_code=404, message="Work experience entry not found")
        if entry["specialist_profile_id"] != profile_id:
            raise AppException(status_code=403, message="Forbidden")

        _validate(payload)
        return await self.repo.update(entry_id, payload)

    async def delete_mine(self, user_id: UUID, entry_id: UUID) -> bool:
        """Delete an entry; enforces ownership."""
        profile_id = await self._resolve_profile_id(user_id)

        entry = await self.repo.get_by_id(entry_id)
        if not entry:
            raise AppException(status_code=404, message="Work experience entry not found")
        if entry["specialist_profile_id"] != profile_id:
            raise AppException(status_code=403, message="Forbidden")

        return await self.repo.delete(entry_id)
