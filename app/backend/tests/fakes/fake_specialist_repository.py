"""In-memory fake for SpecialistRepository."""

import uuid
from uuid import UUID

from domain.ports.specialist_repository import SpecialistRepository


class FakeSpecialistRepository(SpecialistRepository):
    """Dict-backed SpecialistRepository keyed by profile id."""

    def __init__(self) -> None:
        self.rows: dict[UUID, dict] = {}

    def seed(self, row: dict) -> dict:
        """Insert a pre-built specialist profile row (test helper, not part of the port)."""
        self.rows[row["id"]] = row
        return row

    async def add(self, specialist_data: dict) -> dict:
        row = {"id": specialist_data.get("id", uuid.uuid4()), **specialist_data}
        self.rows[row["id"]] = row
        return row

    async def get_by_id(self, specialist_id: UUID) -> dict | None:
        return self.rows.get(specialist_id)

    async def get_by_user_id(self, user_id: UUID) -> dict | None:
        return next((r for r in self.rows.values() if r.get("user_id") == user_id), None)

    async def update(self, user_id: UUID, update_data: dict) -> dict | None:
        row = await self.get_by_user_id(user_id)
        if row is None:
            return None
        row.update(update_data)
        return row

    async def search(
        self,
        name: str | None,
        specialization: str | None,
        offset: int,
        limit: int,
    ) -> list[dict]:
        items = list(self.rows.values())
        if name:
            q = name.lower()
            items = [
                r for r in items
                if q in f"{r.get('first_name', '')} {r.get('last_name', '')}".lower()
            ]
        if specialization:
            items = [r for r in items if r.get("specialization") == specialization]
        return items[offset:offset + limit]

    async def update_extended_profile(self, user_id: UUID, update_data: dict) -> dict | None:
        return await self.update(user_id, update_data)

    async def set_photo_url(self, user_id: UUID, photo_url: str | None) -> None:
        row = await self.get_by_user_id(user_id)
        if row is not None:
            row["photo_url"] = photo_url

    async def request_reverification(self, user_id: UUID) -> dict | None:
        return await self.update(user_id, {"verification_status": "PENDING_VERIFICATION"})

    async def get_public_profile(self, target_user_id: UUID) -> dict | None:
        row = await self.get_by_user_id(target_user_id)
        if row is None or row.get("verification_status") not in ("APPROVED", None):
            return None
        return row
