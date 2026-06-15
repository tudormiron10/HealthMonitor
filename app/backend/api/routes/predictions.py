"""ML Predictions endpoints."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from api.dependencies import get_abe_authority, get_db, require_active_relation_for_patient, require_role, get_current_user
from api.routes.schemas.prediction_schemas import PredictionRead, PredictionRunResponse
from api.routes.patients import get_patient_service
from application.patient_service import PatientService
from application.prediction_service import MODEL_VERSION, PredictionService
from application.record_service import RecordService
from application.report_service import ReportService
from core.exceptions import ForbiddenException, NotFoundException
from infrastructure.persistence.models.enums import RelationStatus, UserRole
from infrastructure.persistence.repositories.patient_repository import SqlAlchemyPatientRepository
from infrastructure.persistence.repositories.prediction_repository import (
    SqlAlchemyPredictionRepository,
)
from infrastructure.persistence.repositories.record_repository import (
    SqlAlchemyRecordRepository,
)
from infrastructure.persistence.repositories.abe_key_repository import SqlAlchemyABEKeyRepository
from infrastructure.persistence.repositories.relation_repository import SqlAlchemyRelationRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predictions", tags=["ML Predictions"])


def get_prediction_service() -> PredictionService:
    return PredictionService()


def get_record_service(
    request: Request,
    db: AsyncSession = Depends(get_db),
    abe_authority=Depends(get_abe_authority),
) -> RecordService:
    return RecordService(SqlAlchemyRecordRepository(db), abe_authority)


def get_prediction_repo(db: AsyncSession = Depends(get_db)) -> SqlAlchemyPredictionRepository:
    return SqlAlchemyPredictionRepository(db)


@router.post("/run/{medical_record_id}", response_model=PredictionRunResponse)
async def run_predictions(
    medical_record_id: str,
    request: Request,
    current_user: dict = Depends(require_role(UserRole.PATIENT)),
    prediction_svc: PredictionService = Depends(get_prediction_service),
    record_svc: RecordService = Depends(get_record_service),
    prediction_repo: SqlAlchemyPredictionRepository = Depends(get_prediction_repo),
    db: AsyncSession = Depends(get_db),
):
    """Utility endpoint: ensure a prediction exists for a record (idempotent)."""

    record = await record_svc.record_repo.find_by_id(medical_record_id)
    if not record:
        raise NotFoundException(f"Medical record {medical_record_id} not found.")

    existing = await prediction_repo.find_by_record_id(medical_record_id)
    if existing:
        pred = existing[0]
        return PredictionRunResponse(
            id=pred["id"],
            medical_record_id=pred["medical_record_id"],
            model_version=pred["model_version"],
            health_score=pred["health_score"],
            metrics=pred["metrics"],
        )

    if record.get("is_encrypted"):
        record = record_svc.decrypt_as_owner(record)
    raw_markers = record.get("raw_markers") or {}

    ml_models = request.app.state.ml_models
    if not ml_models:
        raise NotFoundException("ML models not loaded. Server may need a restart.")

    metrics = prediction_svc.run_predictions(raw_markers, ml_models)
    health_score = prediction_svc.calculate_health_score(metrics)

    prediction_data = {
        "medical_record_id": medical_record_id,
        "model_version": MODEL_VERSION,
        "metrics": metrics,
        "health_score": health_score,
    }
    saved = await prediction_repo.save(prediction_data)
    await db.commit()

    logger.info(
        "Predictions saved for record %s — health_score=%d",
        medical_record_id, health_score,
    )

    return PredictionRunResponse(
        id=saved["id"],
        medical_record_id=saved["medical_record_id"],
        model_version=saved["model_version"],
        health_score=health_score,
        metrics=metrics,
    )


@router.get("/record/{medical_record_id}", response_model=list[PredictionRead])
async def get_predictions_for_record(
    medical_record_id: str,
    current_user: dict = Depends(require_role(UserRole.PATIENT)),
    prediction_repo: SqlAlchemyPredictionRepository = Depends(get_prediction_repo),
):
    """Get all prediction results for a specific medical record."""
    return await prediction_repo.find_by_record_id(medical_record_id)


@router.get("/record/{medical_record_id}/specialist", response_model=list[PredictionRead])
async def get_predictions_for_record_specialist(
    medical_record_id: str,
    current_user: dict = Depends(require_role([UserRole.DOCTOR, UserRole.NUTRITIONIST, UserRole.COACH])),
    prediction_repo: SqlAlchemyPredictionRepository = Depends(get_prediction_repo),
    record_svc: RecordService = Depends(get_record_service),
    db: AsyncSession = Depends(get_db),
):
    """Get all predictions for a record. Requires an APPROVED relation with the patient."""
    record = await record_svc.record_repo.find_by_id(medical_record_id)
    if not record:
        raise NotFoundException("Medical record", medical_record_id)

    patient_profile = await SqlAlchemyPatientRepository(db).get_by_id(record["patient_id"])
    if not patient_profile:
        raise NotFoundException("Patient profile", str(record["patient_id"]))

    specialist_id = UUID(current_user["id"])
    relation = await SqlAlchemyRelationRepository(db).find_existing_between(
        patient_user_id=patient_profile["user_id"],
        specialist_user_id=specialist_id,
        statuses=[RelationStatus.APPROVED],
    )
    if relation is None:
        raise ForbiddenException("No approved relation exists with this patient.")

    return await prediction_repo.find_by_record_id(medical_record_id)


@router.get("/history/me", response_model=list[PredictionRead])
async def get_my_prediction_history(
    current_user: dict = Depends(require_role(UserRole.PATIENT)),
    patient_service: PatientService = Depends(get_patient_service),
    prediction_repo: SqlAlchemyPredictionRepository = Depends(get_prediction_repo),
):
    """Get the full prediction history for the currently logged-in patient."""
    patient_profile = await patient_service.get_my_profile(current_user["id"])
    return await prediction_repo.find_by_patient_id(patient_profile["id"])


@router.get("/history/patient/{patient_user_id}", response_model=list[PredictionRead])
async def get_patient_prediction_history(
    access: dict = Depends(require_active_relation_for_patient),
    prediction_repo: SqlAlchemyPredictionRepository = Depends(get_prediction_repo),
):
    """Get the full prediction history for a patient the calling specialist has access to."""
    return await prediction_repo.find_by_patient_id(access["patient_profile"]["id"])


_SPECIALIST_ROLES = {UserRole.DOCTOR.value, UserRole.NUTRITIONIST.value, UserRole.COACH.value}


@router.get("/{prediction_id}/report")
async def download_report(
    prediction_id: UUID,
    lang: str = Query(default="ro", pattern="^(ro|en)$"),
    current_user: dict = Depends(get_current_user),
    record_svc: RecordService = Depends(get_record_service),
    db: AsyncSession = Depends(get_db),
):
    """Download a PDF report for a completed prediction."""
    prediction_repo = SqlAlchemyPredictionRepository(db)
    patient_repo = SqlAlchemyPatientRepository(db)

    prediction = await prediction_repo.find_by_id(prediction_id)
    if not prediction:
        raise NotFoundException("Prediction", str(prediction_id))

    record = await record_svc.record_repo.find_by_id(prediction["medical_record_id"])
    if not record:
        raise NotFoundException("Medical record", str(prediction["medical_record_id"]))

    patient_profile = await patient_repo.get_by_id(record["patient_id"])
    if not patient_profile:
        raise NotFoundException("Patient profile", str(record["patient_id"]))

    caller_role = current_user["role"]
    caller_id = UUID(current_user["id"])

    if caller_role == UserRole.PATIENT.value:
        if patient_profile["user_id"] != caller_id:
            raise ForbiddenException("You do not have access to this report.")
        record = record_svc.decrypt_as_owner(record)
    elif caller_role in _SPECIALIST_ROLES:
        relation = await SqlAlchemyRelationRepository(db).find_existing_between(
            patient_user_id=patient_profile["user_id"],
            specialist_user_id=caller_id,
            statuses=[RelationStatus.APPROVED],
        )
        if relation is None:
            raise ForbiddenException("No approved relation exists with this patient.")
        key_blob = await SqlAlchemyABEKeyRepository(db).get_active_key(
            caller_id, patient_profile["user_id"]
        )
        record = record_svc.decrypt_as_specialist(record, key_blob)
    else:
        raise ForbiddenException("You do not have access to this report.")

    prediction_data = {
        "patient_first_name": patient_profile["first_name"],
        "patient_last_name":  patient_profile["last_name"],
        "record_date":        str(record["record_date"]),
        "health_score":       prediction["health_score"],
        "metrics":            prediction["metrics"] or {},
        "raw_markers":        record.get("raw_markers") or {},
    }

    pdf_bytes = ReportService().generate(prediction_data, language=lang)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="healthmonitor_report_{prediction_id}.pdf"',
        },
    )
