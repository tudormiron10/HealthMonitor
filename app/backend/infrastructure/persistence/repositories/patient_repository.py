"""SQLAlchemy adapter for the PatientRepository port."""

from uuid import UUID

from sqlalchemy import select, update # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from domain.ports.patient_repository import PatientRepository
from infrastructure.persistence.models.orm_models import PatientProfileORM


class SqlAlchemyPatientRepository(PatientRepository):
    """Concrete implementation of PatientRepository using SQLAlchemy."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, patient_data: dict) -> dict:
        """Persist a new patient profile."""
        new_profile = PatientProfileORM(
            user_id=patient_data["user_id"],
            first_name=patient_data["first_name"],
            last_name=patient_data["last_name"],
            date_of_birth=patient_data["date_of_birth"],
            sex=patient_data["sex"],
        )
        self.session.add(new_profile)
        await self.session.flush()
        return {
            "id": new_profile.id,
            "user_id": new_profile.user_id,
            "first_name": new_profile.first_name,
            "last_name": new_profile.last_name,
            "date_of_birth": new_profile.date_of_birth,
            "sex": new_profile.sex,
        }

    async def get_by_id(self, patient_id: UUID) -> dict | None:
        """Return a single patient profile by primary key."""
        stmt = select(PatientProfileORM).where(PatientProfileORM.id == patient_id)
        result = await self.session.execute(stmt)
        profile = result.scalar_one_or_none()
        
        if not profile:
            return None
            
        return {
            "id": profile.id,
            "user_id": profile.user_id,
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "date_of_birth": profile.date_of_birth,
            "sex": profile.sex,
        }

    async def get_by_user_id(self, user_id: UUID) -> dict | None:
        """Return a single patient profile by user ID."""
        stmt = select(PatientProfileORM).where(PatientProfileORM.user_id == user_id)
        result = await self.session.execute(stmt)
        profile = result.scalar_one_or_none()
        
        if not profile:
            return None
            
        return {
            "id": profile.id,
            "user_id": profile.user_id,
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "date_of_birth": profile.date_of_birth,
            "sex": profile.sex,
        }

    async def get_many_by_user_ids(self, user_ids: list[UUID]) -> list[dict]:
        """Return a list of patient profiles for the given user IDs."""
        if not user_ids:
            return []

        stmt = select(PatientProfileORM).where(PatientProfileORM.user_id.in_(user_ids))
        result = await self.session.execute(stmt)
        return [
            {
                "id": p.id,
                "user_id": p.user_id,
                "first_name": p.first_name,
                "last_name": p.last_name,
                "date_of_birth": p.date_of_birth,
                "sex": p.sex,
            }
            for p in result.scalars().all()
        ]

    async def update(self, user_id: UUID, update_data: dict) -> dict | None:
        """Update a patient profile by user ID and return the updated row."""
        update_data = {k: v for k, v in update_data.items() if v is not None}
        if not update_data:
            return await self.get_by_user_id(user_id)
            
        stmt = (
            update(PatientProfileORM)
            .where(PatientProfileORM.user_id == user_id)
            .values(**update_data)
        )
        await self.session.execute(stmt)
        await self.session.flush()
        return await self.get_by_user_id(user_id)
