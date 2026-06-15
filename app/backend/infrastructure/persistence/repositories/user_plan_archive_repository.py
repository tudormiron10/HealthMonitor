"""SQLAlchemy adapter for per-user plan archive persistence."""

from uuid import UUID

from sqlalchemy import delete, select # type: ignore
from sqlalchemy.dialects.postgresql import insert # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from infrastructure.persistence.models.orm_models import UserPlanArchiveORM


class SqlAlchemyUserPlanArchiveRepository:
    """Stores and retrieves per-user plan archive entries."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def archive(self, user_id: UUID, message_id: UUID) -> None:
        """Mark a plan message as archived for this user. No-op if already archived."""
        stmt = (
            insert(UserPlanArchiveORM)
            .values(user_id=user_id, message_id=message_id)
            .on_conflict_do_nothing(index_elements=["user_id", "message_id"])
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def unarchive(self, user_id: UUID, message_id: UUID) -> None:
        """Remove the archive entry for this (user, message) pair. No-op if not archived."""
        stmt = delete(UserPlanArchiveORM).where(
            UserPlanArchiveORM.user_id == user_id,
            UserPlanArchiveORM.message_id == message_id,
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def is_archived(self, user_id: UUID, message_id: UUID) -> bool:
        """Return True when the plan message is archived for this user."""
        stmt = select(UserPlanArchiveORM).where(
            UserPlanArchiveORM.user_id == user_id,
            UserPlanArchiveORM.message_id == message_id,
        )
        result = await self.session.execute(stmt)
        return result.scalars().first() is not None

    async def list_archived_message_ids(self, user_id: UUID) -> set[UUID]:
        """Return the set of message_ids the user has archived."""
        stmt = select(UserPlanArchiveORM.message_id).where(
            UserPlanArchiveORM.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return set(result.scalars().all())
