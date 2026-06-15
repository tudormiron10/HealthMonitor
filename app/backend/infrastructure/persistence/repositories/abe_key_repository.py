"""SQLAlchemy adapter for ABE user key persistence."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from infrastructure.persistence.models.orm_models import ABEUserKeyORM


class SqlAlchemyABEKeyRepository:
    """Stores and revokes per-relation ABE user keys."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_key(
        self,
        specialist_user_id: UUID,
        patient_user_id: UUID,
        key_blob: bytes,
        marker_attributes: list[str],
    ) -> None:
        """Persist a newly issued ABE user key."""
        row = ABEUserKeyORM(
            specialist_user_id=specialist_user_id,
            patient_user_id=patient_user_id,
            key_blob=key_blob,
            marker_attributes=marker_attributes,
        )
        self.session.add(row)
        await self.session.flush()

    async def revoke_active_key(
        self,
        specialist_user_id: UUID,
        patient_user_id: UUID,
    ) -> None:
        """Soft-revoke the active key for this specialist–patient pair, if any."""
        stmt = (
            update(ABEUserKeyORM)
            .where(
                ABEUserKeyORM.specialist_user_id == specialist_user_id,
                ABEUserKeyORM.patient_user_id == patient_user_id,
                ABEUserKeyORM.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(timezone.utc))
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def get_active_key(
        self,
        specialist_user_id: UUID,
        patient_user_id: UUID,
    ) -> bytes | None:
        """Return the active key_blob for this pair, or None if none exists."""
        row = await self._get_active_row(specialist_user_id, patient_user_id)
        return row.key_blob if row else None

    async def get_active_key_row(
        self,
        specialist_user_id: UUID,
        patient_user_id: UUID,
    ) -> dict | None:
        """Return the full active key row dict, or None if none exists."""
        row = await self._get_active_row(specialist_user_id, patient_user_id)
        if row is None:
            return None
        return {
            "key_blob": row.key_blob,
            "marker_attributes": row.marker_attributes or [],
        }

    async def update_key(
        self,
        specialist_user_id: UUID,
        patient_user_id: UUID,
        key_blob: bytes,
        marker_attributes: list[str],
    ) -> None:
        """Replace the key_blob and marker_attributes on the active row."""
        stmt = (
            update(ABEUserKeyORM)
            .where(
                ABEUserKeyORM.specialist_user_id == specialist_user_id,
                ABEUserKeyORM.patient_user_id == patient_user_id,
                ABEUserKeyORM.revoked_at.is_(None),
            )
            .values(key_blob=key_blob, marker_attributes=marker_attributes)
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def _get_active_row(
        self,
        specialist_user_id: UUID,
        patient_user_id: UUID,
    ) -> ABEUserKeyORM | None:
        """Return the active ABEUserKeyORM row for this pair, or None if none exists."""
        stmt = select(ABEUserKeyORM).where(
            ABEUserKeyORM.specialist_user_id == specialist_user_id,
            ABEUserKeyORM.patient_user_id == patient_user_id,
            ABEUserKeyORM.revoked_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()
