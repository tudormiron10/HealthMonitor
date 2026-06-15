"""SQLAlchemy adapter for the WorkExperienceRepository port."""

from uuid import UUID

from sqlalchemy import delete, select, update # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from domain.ports.work_experience_repository import WorkExperienceRepository
from infrastructure.persistence.models.orm_models import SpecialistWorkExperienceORM


class SqlAlchemyWorkExperienceRepository(WorkExperienceRepository):
    """Concrete implementation of WorkExperienceRepository using SQLAlchemy."""

    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_dict(self, row: SpecialistWorkExperienceORM) -> dict:
        """Convert ORM model to a dictionary."""
        return {
            "id": row.id,
            "specialist_profile_id": row.specialist_profile_id,
            "title": row.title,
            "employer": row.employer,
            "location": row.location,
            "start_date": row.start_date,
            "end_date": row.end_date,
            "description": row.description,
            "display_order": row.display_order,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }

    async def add(self, specialist_profile_id: UUID, data: dict) -> dict:
        """Persist a new work experience entry for a specialist."""
        row = SpecialistWorkExperienceORM(
            specialist_profile_id=specialist_profile_id, **data,
        )
        self.session.add(row)
        await self.session.flush()
        return self._to_dict(row)

    async def list_for_specialist(self, specialist_profile_id: UUID) -> list[dict]:
        """Return all work experience entries for a specialist, ordered by display_order and start_date."""
        stmt = (
            select(SpecialistWorkExperienceORM)
            .where(SpecialistWorkExperienceORM.specialist_profile_id == specialist_profile_id)
            .order_by(
                SpecialistWorkExperienceORM.display_order.asc(),
                SpecialistWorkExperienceORM.start_date.desc(),
            )
        )
        result = await self.session.execute(stmt)
        return [self._to_dict(r) for r in result.scalars().all()]

    async def get_by_id(self, entry_id: UUID) -> dict | None:
        """Return a single work experience entry by primary key."""
        stmt = select(SpecialistWorkExperienceORM).where(
            SpecialistWorkExperienceORM.id == entry_id,
        )
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        return self._to_dict(row) if row else None

    async def update(self, entry_id: UUID, data: dict) -> dict | None:
        """Update a work experience entry by primary key and return the updated row."""
        stmt = (
            update(SpecialistWorkExperienceORM)
            .where(SpecialistWorkExperienceORM.id == entry_id)
            .values(**data)
        )
        await self.session.execute(stmt)
        await self.session.flush()
        return await self.get_by_id(entry_id)

    async def delete(self, entry_id: UUID) -> bool:
        """Delete a work experience entry by primary key and return whether it was successful."""
        stmt = delete(SpecialistWorkExperienceORM).where(
            SpecialistWorkExperienceORM.id == entry_id,
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount > 0
