"""SQLAlchemy adapter for the RelationRepository port."""

from uuid import UUID

from sqlalchemy import func, select, update # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from domain.ports.relation_repository import RelationRepository
from infrastructure.persistence.models.enums import RelationStatus, UserRole
from infrastructure.persistence.models.orm_models import PatientSpecialistRelationORM


class SqlAlchemyRelationRepository(RelationRepository):
    """Concrete implementation of RelationRepository using SQLAlchemy."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        patient_user_id: UUID,
        specialist_user_id: UUID,
        initiated_by: str,
    ) -> dict:
        """Persist a new relation with PENDING status."""
        relation = PatientSpecialistRelationORM(
            patient_id=patient_user_id,
            specialist_id=specialist_user_id,
            status=RelationStatus.PENDING,
            initiated_by=initiated_by,
        )
        self.session.add(relation)
        await self.session.flush()
        return self._to_dict(relation)

    async def get_by_id(self, relation_id: UUID) -> dict | None:
        """Return a single relation by primary key."""
        stmt = select(PatientSpecialistRelationORM).where(
            PatientSpecialistRelationORM.id == relation_id
        )
        result = await self.session.execute(stmt)
        relation = result.scalar_one_or_none()
        return self._to_dict(relation) if relation else None

    async def update_status(self, relation_id: UUID, new_status: str) -> dict | None:
        """Update the status of a relation and return the updated row."""
        stmt = (
            update(PatientSpecialistRelationORM)
            .where(PatientSpecialistRelationORM.id == relation_id)
            .values(status=new_status)
        )
        await self.session.execute(stmt)
        await self.session.flush()
        return await self.get_by_id(relation_id)

    async def find_existing_between(
        self,
        patient_user_id: UUID,
        specialist_user_id: UUID,
        statuses: list[str],
    ) -> dict | None:
        """Return an existing relation between a patient and specialist, if any, with the given statuses."""
        stmt = (
            select(PatientSpecialistRelationORM)
            .where(
                PatientSpecialistRelationORM.patient_id == patient_user_id,
                PatientSpecialistRelationORM.specialist_id == specialist_user_id,
                PatientSpecialistRelationORM.status.in_(statuses),
            )
        )
        result = await self.session.execute(stmt)
        relation = result.scalar_one_or_none()
        return self._to_dict(relation) if relation else None

    async def list_for_user(
        self,
        user_id: UUID,
        role: str,
        statuses: list[str],
    ) -> list[dict]:
        """Return all relations for a user, filtered by role and statuses."""
        if role == UserRole.PATIENT:
            side_filter = PatientSpecialistRelationORM.patient_id == user_id
        else:
            side_filter = PatientSpecialistRelationORM.specialist_id == user_id

        stmt = (
            select(PatientSpecialistRelationORM)
            .where(side_filter, PatientSpecialistRelationORM.status.in_(statuses))
            .order_by(PatientSpecialistRelationORM.id)
        )
        result = await self.session.execute(stmt)
        return [self._to_dict(r) for r in result.scalars().all()]

    async def revoke_all_for_specialist(self, specialist_user_id: UUID) -> int:
        """Revoke all APPROVED relations for a specialist and return the number of rows updated."""
        stmt = (
            update(PatientSpecialistRelationORM)
            .where(
                PatientSpecialistRelationORM.specialist_id == specialist_user_id,
                PatientSpecialistRelationORM.status == RelationStatus.APPROVED,
            )
            .values(status=RelationStatus.REVOKED)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount

    async def count_by_status(self, status: str) -> int:
        """Return the count of relations with a given status."""
        stmt = (
            select(func.count())
            .select_from(PatientSpecialistRelationORM)
            .where(PatientSpecialistRelationORM.status == status)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()

    def _to_dict(self, relation: PatientSpecialistRelationORM) -> dict:
        """Convert ORM model to dictionary."""
        return {
            "id": relation.id,
            "patient_id": relation.patient_id,
            "specialist_id": relation.specialist_id,
            "status": relation.status,
            "initiated_by": relation.initiated_by,
        }
