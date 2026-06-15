"""SQLAlchemy implementation of the RecordRepository."""

from uuid import UUID
from sqlalchemy import func, select # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from domain.ports.record_repository import RecordRepository
from infrastructure.persistence.models.orm_models import MedicalRecordORM


class SqlAlchemyRecordRepository(RecordRepository):
    """SQLAlchemy adapter for medical records."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def save(self, record_data: dict) -> dict:
        """Persist a new medical record."""
        record = MedicalRecordORM(**record_data)
        self.session.add(record)
        await self.session.flush()
        
        return self._to_dict(record)

    async def find_by_id(self, record_id: UUID) -> dict | None:
        """Find a medical record by its ID."""
        stmt = select(MedicalRecordORM).where(MedicalRecordORM.id == record_id)
        result = await self.session.execute(stmt)
        record = result.scalars().first()
        
        if record:
            return self._to_dict(record)
        return None

    async def find_by_patient_id(self, patient_id: UUID) -> list[dict]:
        """Find all medical records for a patient, ordered newest first."""
        stmt = (
            select(MedicalRecordORM)
            .where(MedicalRecordORM.patient_id == patient_id)
            .order_by(MedicalRecordORM.record_date.desc(), MedicalRecordORM.created_at.desc())
        )
        result = await self.session.execute(stmt)
        records = result.scalars().all()

        return [self._to_dict(r) for r in records]

    async def count_all(self) -> int:
        """Return the total number of medical records in the database."""
        result = await self.session.execute(select(func.count()).select_from(MedicalRecordORM))
        return result.scalar_one()

    def _to_dict(self, record: MedicalRecordORM) -> dict:
        """Convert ORM model to dictionary."""
        return {
            "id": record.id,
            "patient_id": record.patient_id,
            "record_date": record.record_date,
            "created_at": record.created_at,
            "source": record.source,
            "document_url": record.document_url,
            "raw_markers": record.raw_markers,
            "raw_markers_encrypted": record.raw_markers_encrypted,
            "is_encrypted": record.is_encrypted,
        }
