"""In-memory fake for MessageRepository."""

import uuid
from datetime import datetime, timezone
from uuid import UUID

from domain.ports.message_repository import MessageRepository
from infrastructure.persistence.models.enums import MessageKind

_PLAN_KINDS = {MessageKind.MEAL_PLAN, MessageKind.WORKOUT_PLAN}


class FakeMessageRepository(MessageRepository):
    """List-backed MessageRepository preserving insertion order (== chronological)."""

    def __init__(self) -> None:
        self.rows: list[dict] = []

    def seed(self, row: dict) -> dict:
        """Append a pre-built message row (test helper; used for plan-message rows
        that carry a joined ``patient_user_id``)."""
        self.rows.append(row)
        return row

    # --- Plan-message queries (not on the MessageRepository port; called directly
    #     by PlanService, which joins conversations in the real adapter). Rows
    #     seeded for these tests carry a ``patient_user_id`` field. ---

    async def list_plan_messages_for_patient(self, patient_user_id: UUID) -> list[dict]:
        return [
            r for r in self.rows
            if r.get("patient_user_id") == patient_user_id and r["message_kind"] in _PLAN_KINDS
        ]

    async def list_plan_messages_for_specialist(self, specialist_user_id: UUID) -> list[dict]:
        return [
            r for r in self.rows
            if r.get("sender_id") == specialist_user_id and r["message_kind"] in _PLAN_KINDS
        ]

    async def get_plan_message_with_conversation(self, message_id: UUID) -> dict | None:
        return next((r for r in self.rows if r["id"] == message_id), None)

    async def create(
        self,
        conversation_id: UUID,
        sender_id: UUID | None,
        message_kind: str,
        message_text: str,
        payload: dict | None = None,
    ) -> dict:
        row = {
            "id": uuid.uuid4(),
            "conversation_id": conversation_id,
            "sender_id": sender_id,
            "message_kind": message_kind,
            "message_text": message_text,
            "payload": payload,
            "sent_at": datetime.now(timezone.utc),
            "is_read": False,
        }
        self.rows.append(row)
        return row

    async def list_for_conversation(
        self,
        conversation_id: UUID,
        since_message_id: UUID | None = None,
        limit: int = 200,
    ) -> list[dict]:
        msgs = [m for m in self.rows if m["conversation_id"] == conversation_id]
        if since_message_id is not None:
            ids = [m["id"] for m in msgs]
            if since_message_id in ids:
                msgs = msgs[ids.index(since_message_id) + 1:]
        return msgs[:limit]

    async def mark_read_for_user(
        self,
        conversation_id: UUID,
        recipient_user_id: UUID,
    ) -> int:
        count = 0
        for m in self.rows:
            if (
                m["conversation_id"] == conversation_id
                and not m["is_read"]
                and m["sender_id"] != recipient_user_id
            ):
                m["is_read"] = True
                count += 1
        return count

    async def count_unread_for_user(self, user_id: UUID) -> dict:
        result: dict = {}
        for m in self.rows:
            if not m["is_read"] and m["sender_id"] != user_id:
                result[m["conversation_id"]] = result.get(m["conversation_id"], 0) + 1
        return result

    async def get_last_message(self, conversation_id: UUID) -> dict | None:
        msgs = [m for m in self.rows if m["conversation_id"] == conversation_id]
        return msgs[-1] if msgs else None
