"""SQLAlchemy implementation of the PredictionRepository."""

from uuid import UUID
from sqlalchemy import func, select # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore
from sqlalchemy.orm import selectinload # type: ignore

from domain.ports.prediction_repository import PredictionRepository
from infrastructure.persistence.models.orm_models import (
    MLPredictionORM,
    MedicalRecordORM,
)


class SqlAlchemyPredictionRepository(PredictionRepository):
    """SQLAlchemy adapter for ML predictions."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def save(self, prediction_data: dict) -> dict:
        """Persist a new prediction result."""
        prediction = MLPredictionORM(**prediction_data)
        self.session.add(prediction)
        await self.session.flush()

        return self._to_dict(prediction)

    async def find_by_id(self, prediction_id: UUID) -> dict | None:
        """Find a single prediction by its primary key."""
        stmt = select(MLPredictionORM).where(MLPredictionORM.id == prediction_id)
        result = await self.session.execute(stmt)
        prediction = result.scalar_one_or_none()
        return self._to_dict(prediction) if prediction else None

    async def find_by_record_id(self, record_id: UUID) -> list[dict]:
        """Find all predictions for a given medical record."""
        stmt = (
            select(MLPredictionORM)
            .where(MLPredictionORM.medical_record_id == record_id)
        )
        result = await self.session.execute(stmt)
        predictions = result.scalars().all()

        return [self._to_dict(p) for p in predictions]

    async def find_by_patient_id(self, patient_id: UUID) -> list[dict]:
        """Find all predictions for a patient, ordered by record date descending."""
        stmt = (
            select(MLPredictionORM)
            .join(MedicalRecordORM)
            .where(MedicalRecordORM.patient_id == patient_id)
            .order_by(MedicalRecordORM.record_date.desc())
        )
        result = await self.session.execute(stmt)
        predictions = result.scalars().all()

        return [self._to_dict(p) for p in predictions]

    async def find_latest_for_patients(
        self, patient_profile_ids: list[UUID]
    ) -> dict[UUID, dict]:
        """Return one prediction per patient — the one attached to their most recently uploaded record."""
        if not patient_profile_ids:
            return {}

        stmt = (
            select(
                MLPredictionORM,
                MedicalRecordORM.patient_id,
                MedicalRecordORM.record_date,
                MedicalRecordORM.created_at,
            )
            .join(MedicalRecordORM, MLPredictionORM.medical_record_id == MedicalRecordORM.id)
            .where(MedicalRecordORM.patient_id.in_(patient_profile_ids))
            .prefix_with("DISTINCT ON (medical_records.patient_id)")
            .order_by(
                MedicalRecordORM.patient_id,
                MedicalRecordORM.created_at.desc(),
                MLPredictionORM.id.desc(),
            )
        )
        result = await self.session.execute(stmt)
        return {
            patient_id: {
                **self._to_dict(prediction),
                "record_date": record_date,
                "uploaded_at": created_at,
            }
            for prediction, patient_id, record_date, created_at in result.all()
        }

    async def count_all(self) -> int:
        """Return the total number of predictions in the database."""
        result = await self.session.execute(select(func.count()).select_from(MLPredictionORM))
        return result.scalar_one()

    def _to_dict(self, prediction: MLPredictionORM) -> dict:
        """Convert ORM model to dictionary."""
        return {
            "id": prediction.id,
            "medical_record_id": prediction.medical_record_id,
            "model_version": prediction.model_version,
            "metrics": prediction.metrics,
            "health_score": prediction.health_score,
        }
