"""SQLAlchemy adapter for the AccessRequest repository."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from infrastructure.persistence.models.enums import AccessRequestStatus
from infrastructure.persistence.models.orm_models import AccessRequestORM


class SqlAlchemyAccessRequestRepository:
    """Stores and queries consent access requests."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: dict) -> dict:
        """Persist a new access request."""
        row = AccessRequestORM(**data)
        self.session.add(row)
        await self.session.flush()
        return self._to_dict(row)

    async def find_pending_for_conversation(self, conversation_id: UUID) -> list[dict]:
        """Return all PENDING requests for a conversation."""
        stmt = select(AccessRequestORM).where(
            AccessRequestORM.conversation_id == conversation_id,
            AccessRequestORM.status == AccessRequestStatus.PENDING,
        )
        result = await self.session.execute(stmt)
        return [self._to_dict(r) for r in result.scalars().all()]

    async def get_by_id(self, request_id: UUID) -> dict | None:
        """Return a single access request by primary key."""
        stmt = select(AccessRequestORM).where(AccessRequestORM.id == request_id)
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        return self._to_dict(row) if row else None

    async def update_status(
        self,
        request_id: UUID,
        status: AccessRequestStatus,
        approved_markers: list | None = None,
    ) -> dict | None:
        """Set status, approved_markers, and responded_at; return the updated row."""
        values: dict = {
            "status": status,
            "responded_at": datetime.now(timezone.utc),
        }
        if approved_markers is not None:
            values["approved_markers"] = approved_markers
        stmt = (
            update(AccessRequestORM)
            .where(AccessRequestORM.id == request_id)
            .values(**values)
        )
        await self.session.execute(stmt)
        await self.session.flush()
        return await self.get_by_id(request_id)

    def _to_dict(self, row: AccessRequestORM) -> dict:
        return {
            "id": row.id,
            "conversation_id": row.conversation_id,
            "specialist_user_id": row.specialist_user_id,
            "patient_user_id": row.patient_user_id,
            "requested_markers": row.requested_markers,
            "justification": row.justification,
            "status": row.status,
            "approved_markers": row.approved_markers,
            "created_at": row.created_at,
            "responded_at": row.responded_at,
        }
