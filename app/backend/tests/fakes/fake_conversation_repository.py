"""In-memory fake for ConversationRepository."""

import uuid
from datetime import datetime, timezone
from uuid import UUID

from domain.ports.conversation_repository import ConversationRepository


class FakeConversationRepository(ConversationRepository):
    """Dict-backed ConversationRepository keyed by conversation id."""

    def __init__(self) -> None:
        self.rows: dict[UUID, dict] = {}

    def seed(self, row: dict) -> dict:
        """Insert a pre-built conversation row (test helper, not part of the port)."""
        self.rows[row["id"]] = row
        return row

    async def get_by_id(self, conversation_id: UUID) -> dict | None:
        return self.rows.get(conversation_id)

    async def find_between(
        self,
        patient_user_id: UUID,
        specialist_user_id: UUID,
    ) -> dict | None:
        return next(
            (
                r for r in self.rows.values()
                if r["patient_user_id"] == patient_user_id
                and r["specialist_user_id"] == specialist_user_id
            ),
            None,
        )

    async def upsert(
        self,
        patient_user_id: UUID,
        specialist_user_id: UUID,
    ) -> dict:
        existing = await self.find_between(patient_user_id, specialist_user_id)
        if existing is not None:
            return existing
        row = {
            "id": uuid.uuid4(),
            "patient_user_id": patient_user_id,
            "specialist_user_id": specialist_user_id,
            "updated_at": datetime.now(timezone.utc),
        }
        self.rows[row["id"]] = row
        return row

    async def list_for_user(self, user_id: UUID) -> list[dict]:
        return [
            r for r in self.rows.values()
            if r["patient_user_id"] == user_id or r["specialist_user_id"] == user_id
        ]
