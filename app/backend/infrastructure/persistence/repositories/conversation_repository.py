"""SQLAlchemy adapter for the ConversationRepository port."""

import uuid
from uuid import UUID

from sqlalchemy import func, select # type: ignore
from sqlalchemy.dialects.postgresql import insert as pg_insert # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from domain.ports.conversation_repository import ConversationRepository
from infrastructure.persistence.models.orm_models import ConversationORM, MessageORM


class SqlAlchemyConversationRepository(ConversationRepository):
    """Concrete implementation of ConversationRepository using SQLAlchemy."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, conversation_id: UUID) -> dict | None:
        """Return a single conversation by primary key."""
        stmt = select(ConversationORM).where(ConversationORM.id == conversation_id)
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        return self._to_dict(row) if row else None

    async def find_between(
        self,
        patient_user_id: UUID,
        specialist_user_id: UUID,
    ) -> dict | None:
        """Return the conversation between a patient and specialist, if any."""
        stmt = select(ConversationORM).where(
            ConversationORM.patient_user_id == patient_user_id,
            ConversationORM.specialist_user_id == specialist_user_id,
        )
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        return self._to_dict(row) if row else None

    async def upsert(
        self,
        patient_user_id: UUID,
        specialist_user_id: UUID,
    ) -> dict:
        """Create a new conversation between a patient and specialist, or update the updated_at timestamp if it already exists."""
        stmt = (
            pg_insert(ConversationORM)
            .values(
                id=uuid.uuid4(),
                patient_user_id=patient_user_id,
                specialist_user_id=specialist_user_id,
            )
            .on_conflict_do_update(
                constraint="uq_conversations_pair",
                set_={"updated_at": func.now()},
            )
            .returning(ConversationORM)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return self._to_dict(result.scalar_one())

    async def list_for_user(self, user_id: UUID) -> list[dict]:
        """Return all conversations for a user, ordered by last message sent_at or conversation created_at."""
        latest_msg = (
            select(
                MessageORM.conversation_id,
                func.max(MessageORM.sent_at).label("last_sent_at"),
            )
            .group_by(MessageORM.conversation_id)
            .subquery()
        )
        stmt = (
            select(ConversationORM)
            .outerjoin(latest_msg, latest_msg.c.conversation_id == ConversationORM.id)
            .where(
                (ConversationORM.patient_user_id == user_id)
                | (ConversationORM.specialist_user_id == user_id)
            )
            .order_by(
                func.coalesce(latest_msg.c.last_sent_at, ConversationORM.created_at).desc()
            )
        )
        result = await self.session.execute(stmt)
        return [self._to_dict(row) for row in result.scalars().all()]

    def _to_dict(self, conv: ConversationORM) -> dict:
        """Convert a ConversationORM row to a dictionary."""
        return {
            "id": conv.id,
            "patient_user_id": conv.patient_user_id,
            "specialist_user_id": conv.specialist_user_id,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
        }
