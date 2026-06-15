"""SQLAlchemy adapter for the EducationRepository port."""

from uuid import UUID

from sqlalchemy import delete, select, update # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from domain.ports.education_repository import EducationRepository
from infrastructure.persistence.models.orm_models import SpecialistEducationORM


class SqlAlchemyEducationRepository(EducationRepository):
    """Concrete implementation of EducationRepository using SQLAlchemy."""

    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_dict(self, row: SpecialistEducationORM) -> dict:
        """Convert a SpecialistEducationORM row to a dictionary."""
        return {
            "id": row.id,
            "specialist_profile_id": row.specialist_profile_id,
            "institution": row.institution,
            "degree": row.degree,
            "field_of_study": row.field_of_study,
            "year_completed": row.year_completed,
            "honors": row.honors,
            "display_order": row.display_order,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }

    async def add(self, specialist_profile_id: UUID, data: dict) -> dict:
        """Persist a new education entry for a specialist."""
        row = SpecialistEducationORM(
            specialist_profile_id=specialist_profile_id, **data,
        )
        self.session.add(row)
        await self.session.flush()
        return self._to_dict(row)

    async def list_for_specialist(self, specialist_profile_id: UUID) -> list[dict]:
        """Return all education entries for a specialist, ordered by display_order and year_completed."""
        stmt = (
            select(SpecialistEducationORM)
            .where(SpecialistEducationORM.specialist_profile_id == specialist_profile_id)
            .order_by(
                SpecialistEducationORM.display_order.asc(),
                SpecialistEducationORM.year_completed.desc(),
            )
        )
        result = await self.session.execute(stmt)
        return [self._to_dict(r) for r in result.scalars().all()]

    async def get_by_id(self, entry_id: UUID) -> dict | None:
        """Return a single education entry by primary key."""
        stmt = select(SpecialistEducationORM).where(
            SpecialistEducationORM.id == entry_id,
        )
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        return self._to_dict(row) if row else None

    async def update(self, entry_id: UUID, data: dict) -> dict | None:
        """Update an education entry by primary key and return the updated row."""
        stmt = (
            update(SpecialistEducationORM)
            .where(SpecialistEducationORM.id == entry_id)
            .values(**data)
        )
        await self.session.execute(stmt)
        await self.session.flush()
        return await self.get_by_id(entry_id)

    async def delete(self, entry_id: UUID) -> bool:
        """Delete an education entry by primary key. Return True if deleted, False if not found."""
        stmt = delete(SpecialistEducationORM).where(
            SpecialistEducationORM.id == entry_id,
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount > 0
