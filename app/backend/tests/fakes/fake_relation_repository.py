"""In-memory fake for RelationRepository."""

import uuid
from uuid import UUID

from domain.ports.relation_repository import RelationRepository
from infrastructure.persistence.models.enums import RelationStatus


class FakeRelationRepository(RelationRepository):
    """Dict-backed RelationRepository. Use ``seed`` to pre-load rows in Arrange."""

    def __init__(self) -> None:
        self.rows: dict[UUID, dict] = {}

    def seed(self, row: dict) -> dict:
        """Insert a pre-built relation row (test helper, not part of the port)."""
        self.rows[row["id"]] = row
        return row

    async def create(
        self,
        patient_user_id: UUID,
        specialist_user_id: UUID,
        initiated_by: str,
    ) -> dict:
        row = {
            "id": uuid.uuid4(),
            "patient_id": patient_user_id,
            "specialist_id": specialist_user_id,
            "status": RelationStatus.PENDING,
            "initiated_by": initiated_by,
        }
        self.rows[row["id"]] = row
        return row

    async def get_by_id(self, relation_id: UUID) -> dict | None:
        return self.rows.get(relation_id)

    async def update_status(self, relation_id: UUID, new_status: str) -> dict | None:
        row = self.rows.get(relation_id)
        if row is None:
            return None
        row["status"] = new_status
        return row

    async def find_existing_between(
        self,
        patient_user_id: UUID,
        specialist_user_id: UUID,
        statuses: list[str],
    ) -> dict | None:
        for row in self.rows.values():
            if (
                row["patient_id"] == patient_user_id
                and row["specialist_id"] == specialist_user_id
                and row["status"] in statuses
            ):
                return row
        return None

    async def list_for_user(
        self,
        user_id: UUID,
        role: str,
        statuses: list[str],
    ) -> list[dict]:
        return [
            row
            for row in self.rows.values()
            if (row["patient_id"] == user_id or row["specialist_id"] == user_id)
            and row["status"] in statuses
        ]

    async def revoke_all_for_specialist(self, specialist_user_id: UUID) -> int:
        count = 0
        for row in self.rows.values():
            if (
                row["specialist_id"] == specialist_user_id
                and row["status"] == RelationStatus.APPROVED
            ):
                row["status"] = RelationStatus.REVOKED
                count += 1
        return count

    async def count_by_status(self, status: str) -> int:
        return sum(1 for row in self.rows.values() if row["status"] == status)
