"""SQLAlchemy adapter for the MessageRepository port."""

from uuid import UUID

from sqlalchemy import func, select, update # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from domain.ports.message_repository import MessageRepository
from infrastructure.persistence.models.enums import MessageKind
from infrastructure.persistence.models.orm_models import ConversationORM, MessageORM


class SqlAlchemyMessageRepository(MessageRepository):
    """Concrete implementation of MessageRepository using SQLAlchemy."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        conversation_id: UUID,
        sender_id: UUID | None,
        message_kind: str,
        message_text: str,
        payload: dict | None = None,
    ) -> dict:
        """Persist a new message in a conversation."""
        msg = MessageORM(
            conversation_id=conversation_id,
            sender_id=sender_id,
            message_kind=MessageKind(message_kind),
            message_text=message_text,
            payload=payload,
        )
        self.session.add(msg)
        await self.session.flush()
        return self._to_dict(msg)

    async def list_for_conversation(
        self,
        conversation_id: UUID,
        since_message_id: UUID | None = None,
        limit: int = 200,
    ) -> list[dict]:
        """Return messages in a conversation, optionally after a given message ID, limited to a number of results."""
        stmt = (
            select(MessageORM)
            .where(MessageORM.conversation_id == conversation_id)
            .order_by(MessageORM.sent_at.asc())
            .limit(limit)
        )
        if since_message_id is not None:
            cursor_ts = (
                select(MessageORM.sent_at)
                .where(MessageORM.id == since_message_id)
                .scalar_subquery()
            )
            stmt = stmt.where(MessageORM.sent_at > cursor_ts)
        result = await self.session.execute(stmt)
        return [self._to_dict(m) for m in result.scalars().all()]

    async def mark_read_for_user(
        self,
        conversation_id: UUID,
        recipient_user_id: UUID,
    ) -> int:
        """Mark all unread messages in a conversation as read for a given recipient user, and return the number of messages updated."""
        stmt = (
            update(MessageORM)
            .where(
                MessageORM.conversation_id == conversation_id,
                MessageORM.is_read.is_(False),
                (MessageORM.sender_id.is_(None)) | (MessageORM.sender_id != recipient_user_id),
            )
            .values(is_read=True)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount

    async def count_unread_for_user(self, user_id: UUID) -> dict:
        """Return a dictionary mapping conversation IDs to the count of unread messages for a given user."""
        stmt = (
            select(
                MessageORM.conversation_id,
                func.count().label("unread_count"),
            )
            .join(ConversationORM, ConversationORM.id == MessageORM.conversation_id)
            .where(
                (ConversationORM.patient_user_id == user_id)
                | (ConversationORM.specialist_user_id == user_id),
                MessageORM.is_read.is_(False),
                (MessageORM.sender_id.is_(None)) | (MessageORM.sender_id != user_id),
            )
            .group_by(MessageORM.conversation_id)
        )
        result = await self.session.execute(stmt)
        return {row.conversation_id: row.unread_count for row in result.all()}

    async def get_last_message(self, conversation_id: UUID) -> dict | None:
        """Return the last message in a conversation, or None if there are no messages."""
        stmt = (
            select(MessageORM)
            .where(MessageORM.conversation_id == conversation_id)
            .order_by(MessageORM.sent_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        return self._to_dict(row) if row else None

    async def list_plan_messages_for_specialist(self, specialist_user_id: UUID) -> list[dict]:
        """Return all MEAL_PLAN and WORKOUT_PLAN messages sent by this specialist, newest first."""
        stmt = (
            select(
                MessageORM,
                ConversationORM.patient_user_id.label("conv_patient_user_id"),
                ConversationORM.specialist_user_id.label("conv_specialist_user_id"),
            )
            .join(ConversationORM, ConversationORM.id == MessageORM.conversation_id)
            .where(
                MessageORM.sender_id == specialist_user_id,
                MessageORM.message_kind.in_([MessageKind.MEAL_PLAN, MessageKind.WORKOUT_PLAN]),
            )
            .order_by(MessageORM.sent_at.desc())
        )
        result = await self.session.execute(stmt)
        rows = result.all()
        return [
            {
                **self._to_dict(r.MessageORM),
                "patient_user_id": r.conv_patient_user_id,
                "specialist_user_id": r.conv_specialist_user_id,
            }
            for r in rows
        ]

    async def list_plan_messages_for_patient(self, patient_user_id: UUID) -> list[dict]:
        """Return all MEAL_PLAN and WORKOUT_PLAN messages in this patient's conversations, newest first."""
        stmt = (
            select(
                MessageORM,
                ConversationORM.patient_user_id.label("conv_patient_user_id"),
                ConversationORM.specialist_user_id.label("conv_specialist_user_id"),
            )
            .join(ConversationORM, ConversationORM.id == MessageORM.conversation_id)
            .where(
                ConversationORM.patient_user_id == patient_user_id,
                MessageORM.message_kind.in_([MessageKind.MEAL_PLAN, MessageKind.WORKOUT_PLAN]),
            )
            .order_by(MessageORM.sent_at.desc())
        )
        result = await self.session.execute(stmt)
        rows = result.all()
        return [
            {
                **self._to_dict(r.MessageORM),
                "patient_user_id": r.conv_patient_user_id,
                "specialist_user_id": r.conv_specialist_user_id,
            }
            for r in rows
        ]

    async def get_plan_message_with_conversation(self, message_id: UUID) -> dict | None:
        """Return a single message with its conversation's patient/specialist IDs, or None."""
        stmt = (
            select(
                MessageORM,
                ConversationORM.patient_user_id.label("conv_patient_user_id"),
                ConversationORM.specialist_user_id.label("conv_specialist_user_id"),
            )
            .join(ConversationORM, ConversationORM.id == MessageORM.conversation_id)
            .where(MessageORM.id == message_id)
        )
        result = await self.session.execute(stmt)
        row = result.one_or_none()
        if row is None:
            return None
        return {
            **self._to_dict(row.MessageORM),
            "patient_user_id": row.conv_patient_user_id,
            "specialist_user_id": row.conv_specialist_user_id,
        }

    def _to_dict(self, msg: MessageORM) -> dict:
        """Convert a MessageORM row to a dictionary."""
        return {
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender_id": msg.sender_id,
            "message_kind": msg.message_kind,
            "message_text": msg.message_text,
            "payload": msg.payload,
            "sent_at": msg.sent_at,
            "is_read": msg.is_read,
        }
