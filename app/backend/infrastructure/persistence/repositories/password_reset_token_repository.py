"""SQLAlchemy adapter for the PasswordResetTokenRepository port."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from domain.ports.password_reset_token_repository import PasswordResetTokenRepository
from infrastructure.persistence.models.orm_models import PasswordResetTokenORM


class SqlAlchemyPasswordResetTokenRepository(PasswordResetTokenRepository):
    """Concrete implementation of PasswordResetTokenRepository using SQLAlchemy."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_id: UUID, token_hash: str, expires_at: datetime) -> dict:
        """Persist a new reset token row."""
        row = PasswordResetTokenORM(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.session.add(row)
        await self.session.flush()
        return self._to_dict(row)

    async def get_by_token_hash(self, token_hash: str) -> dict | None:
        """Return a single token row by its hash."""
        stmt = select(PasswordResetTokenORM).where(
            PasswordResetTokenORM.token_hash == token_hash
        )
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        return self._to_dict(row) if row else None

    async def get_latest_unused_for_user(self, user_id: UUID) -> dict | None:
        """Return the user's most recent unused token, ordered by created_at DESC."""
        stmt = (
            select(PasswordResetTokenORM)
            .where(
                PasswordResetTokenORM.user_id == user_id,
                PasswordResetTokenORM.used_at.is_(None),
            )
            .order_by(PasswordResetTokenORM.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        return self._to_dict(row) if row else None

    async def mark_used(self, token_id: UUID) -> None:
        """Set used_at to the current time for the given token."""
        stmt = (
            update(PasswordResetTokenORM)
            .where(PasswordResetTokenORM.id == token_id)
            .values(used_at=datetime.now(timezone.utc))
        )
        await self.session.execute(stmt)
        await self.session.flush()

    def _to_dict(self, row: PasswordResetTokenORM) -> dict:
        return {
            "id": row.id,
            "user_id": row.user_id,
            "token_hash": row.token_hash,
            "expires_at": row.expires_at,
            "used_at": row.used_at,
            "created_at": row.created_at,
        }
