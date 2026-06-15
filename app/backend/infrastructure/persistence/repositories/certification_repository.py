"""SQLAlchemy adapter for the CertificationRepository port."""

from uuid import UUID

from sqlalchemy import delete, select, update # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from domain.ports.certification_repository import CertificationRepository
from infrastructure.persistence.models.orm_models import SpecialistCertificationORM


class SqlAlchemyCertificationRepository(CertificationRepository):
    """Concrete implementation of CertificationRepository using SQLAlchemy."""

    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_dict(self, row: SpecialistCertificationORM) -> dict:
        """Convert a SpecialistCertificationORM row to a dictionary."""
        return {
            "id": row.id,
            "specialist_profile_id": row.specialist_profile_id,
            "name": row.name,
            "issuing_body": row.issuing_body,
            "certification_number": row.certification_number,
            "issue_date": row.issue_date,
            "expiry_date": row.expiry_date,
            "display_order": row.display_order,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }

    async def add(self, specialist_profile_id: UUID, data: dict) -> dict:
        """Persist a new certification entry for a specialist."""
        row = SpecialistCertificationORM(
            specialist_profile_id=specialist_profile_id, **data,
        )
        self.session.add(row)
        await self.session.flush()
        return self._to_dict(row)

    async def list_for_specialist(self, specialist_profile_id: UUID) -> list[dict]:
        """Return all certifications for a specialist, ordered by display_order and issue_date."""
        stmt = (
            select(SpecialistCertificationORM)
            .where(SpecialistCertificationORM.specialist_profile_id == specialist_profile_id)
            .order_by(
                SpecialistCertificationORM.display_order.asc(),
                SpecialistCertificationORM.issue_date.desc(),
            )
        )
        result = await self.session.execute(stmt)
        return [self._to_dict(r) for r in result.scalars().all()]

    async def get_by_id(self, entry_id: UUID) -> dict | None:
        """Return a single certification entry by primary key."""
        stmt = select(SpecialistCertificationORM).where(
            SpecialistCertificationORM.id == entry_id,
        )
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        return self._to_dict(row) if row else None

    async def update(self, entry_id: UUID, data: dict) -> dict | None:
        """Update a certification entry by primary key and return the updated row."""
        stmt = (
            update(SpecialistCertificationORM)
            .where(SpecialistCertificationORM.id == entry_id)
            .values(**data)
        )
        await self.session.execute(stmt)
        await self.session.flush()
        return await self.get_by_id(entry_id)

    async def delete(self, entry_id: UUID) -> bool:
        """Delete a certification entry by primary key. Return True if deleted, False if not found."""
        stmt = delete(SpecialistCertificationORM).where(
            SpecialistCertificationORM.id == entry_id,
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount > 0
