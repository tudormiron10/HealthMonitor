"""In-memory fake for PatientRepository."""

import uuid
from uuid import UUID

from domain.ports.patient_repository import PatientRepository


class FakePatientRepository(PatientRepository):
    """Dict-backed PatientRepository keyed by profile id."""

    def __init__(self) -> None:
        self.rows: dict[UUID, dict] = {}

    def seed(self, row: dict) -> dict:
        """Insert a pre-built patient profile row (test helper, not part of the port)."""
        self.rows[row["id"]] = row
        return row

    async def add(self, patient_data: dict) -> dict:
        row = {"id": patient_data.get("id", uuid.uuid4()), **patient_data}
        self.rows[row["id"]] = row
        return row

    async def get_by_id(self, patient_id: UUID) -> dict | None:
        return self.rows.get(patient_id)

    async def get_by_user_id(self, user_id: UUID) -> dict | None:
        return next((r for r in self.rows.values() if r.get("user_id") == user_id), None)

    async def update(self, user_id: UUID, update_data: dict) -> dict | None:
        row = await self.get_by_user_id(user_id)
        if row is None:
            return None
        row.update(update_data)
        return row

    async def get_many_by_user_ids(self, user_ids: list[UUID]) -> list[dict]:
        wanted = set(user_ids)
        return [r for r in self.rows.values() if r.get("user_id") in wanted]
