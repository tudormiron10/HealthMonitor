"""Medical Records endpoints."""

import logging
from datetime import date
from pathlib import Path

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from api.dependencies import (
    get_abe_authority,
    get_db,
    get_file_storage,
    get_notification_service,
    get_pdf_parser,
    require_active_relation_for_patient,
    require_role,
)
from infrastructure.persistence.repositories.patient_repository import SqlAlchemyPatientRepository
from infrastructure.persistence.repositories.relation_repository import SqlAlchemyRelationRepository
from api.routes.schemas.pdf_schemas import ParsedPDFResponse
from api.routes.schemas.record_schemas import MedicalRecordCreate, MedicalRecordRead
from application.notification_service import NotificationService
from application.prediction_service import MODEL_VERSION, PredictionService
from application.record_service import RecordService
from domain.ports.file_storage_port import FileStorage
from domain.ports.pdf_parser_port import PdfParser
from core.config import get_settings
from core.exceptions import AppException, ForbiddenException, NotFoundException, ValidationException
from infrastructure.persistence.models.enums import RelationStatus, UserRole
from infrastructure.persistence.repositories.abe_key_repository import SqlAlchemyABEKeyRepository
from infrastructure.persistence.repositories.prediction_repository import SqlAlchemyPredictionRepository
from infrastructure.persistence.repositories.record_repository import SqlAlchemyRecordRepository

from api.routes.patients import get_patient_service
from application.patient_service import PatientService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/records", tags=["Medical Records"])

ALLOWED_CONTENT_TYPES = {"application/pdf"}


def get_record_service(
    request: Request,
    db: AsyncSession = Depends(get_db),
    abe_authority=Depends(get_abe_authority),
) -> RecordService:
    repo = SqlAlchemyRecordRepository(db)
    return RecordService(repo, abe_authority)


@router.post("/manual-entry", response_model=MedicalRecordRead)
async def create_manual_record(
    record_in: MedicalRecordCreate,
    request: Request,
    current_user: dict = Depends(require_role(UserRole.PATIENT)),
    record_service: RecordService = Depends(get_record_service),
    patient_service: PatientService = Depends(get_patient_service),
    notification_service: NotificationService = Depends(get_notification_service),
    db: AsyncSession = Depends(get_db),
):
    """Submit a medical record manually and generate its single ML prediction."""
    
    patient_profile = await patient_service.get_my_profile(current_user["id"])
    result = await record_service.add_manual_entry(
        patient_profile["id"],
        record_in,
        patient_user_id=UUID(current_user["id"]),
    )

    ml_models = request.app.state.ml_models
    if not ml_models:
        await db.rollback()
        raise AppException(status_code=503, message="ML models are not loaded. Please retry shortly.")

    prediction_service = PredictionService()
    prediction_repo = SqlAlchemyPredictionRepository(db)
    raw_markers = record_in.markers.model_dump(exclude_none=True)
    try:
        metrics = prediction_service.run_predictions(raw_markers, ml_models)
        health_score = prediction_service.calculate_health_score(metrics)
        saved_prediction = await prediction_repo.save({
            "medical_record_id": result["id"],
            "model_version": MODEL_VERSION,
            "metrics": metrics,
            "health_score": health_score,
        })
    except Exception:
        await db.rollback()
        logger.exception("Prediction generation failed during manual entry; record not saved.")
        raise AppException(
            status_code=500,
            message="Could not generate the prediction. The record was not saved. Please try again.",
        )

    await db.commit()

    try:
        await notification_service.notify_red_flag(
            patient_user_id=UUID(current_user["id"]),
            record_id=result["id"],
            prediction_id=saved_prediction["id"],
            predictions=metrics,
        )
        await db.commit()
    except Exception:
        logger.warning("Red flag notification failed for record %s", result["id"])
        await db.rollback()

    return record_service.decrypt_as_owner(result)


@router.post("/upload-pdf", response_model=ParsedPDFResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(UserRole.PATIENT)),
    patient_service: PatientService = Depends(get_patient_service),
    parser: PdfParser = Depends(get_pdf_parser),
    storage: FileStorage = Depends(get_file_storage),
):
    """Upload a PDF lab report, parse it, and return the extracted values."""
    settings = get_settings()
    max_size = settings.max_upload_size_mb * 1024 * 1024

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Only PDF files are accepted.",
        )

    file_content = await file.read()

    if len(file_content) > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {settings.max_upload_size_mb} MB.",
        )

    if len(file_content) == 0:
        raise ValidationException("Uploaded file is empty.")

    if not file_content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=415,
            detail="File does not appear to be a valid PDF.",
        )

    patient_profile = await patient_service.get_my_profile(current_user["id"])
    patient_id = patient_profile["id"]

    document_url = await storage.save_pdf(
        patient_id=patient_id,
        file_content=file_content,
        original_filename=file.filename or "upload.pdf",
    )

    extracted_markers = parser.process_pdf(document_url)

    logger.info(
        "PDF uploaded and parsed for patient %s, stored at %s",
        patient_id, document_url,
    )

    return ParsedPDFResponse(
        document_url=document_url,
        extracted_markers=extracted_markers,
    )


@router.get("/my-records", response_model=list[MedicalRecordRead])
async def get_my_records(
    current_user: dict = Depends(require_role(UserRole.PATIENT)),
    record_service: RecordService = Depends(get_record_service),
    patient_service: PatientService = Depends(get_patient_service),
):
    """Get all medical records for the currently logged-in patient."""
    patient_profile = await patient_service.get_my_profile(current_user["id"])
    records = await record_service.get_patient_records(patient_profile["id"])
    return [record_service.decrypt_as_owner(r) for r in records]


@router.get("/patient/{patient_user_id}", response_model=list[MedicalRecordRead])
async def get_patient_records(
    access: dict = Depends(require_active_relation_for_patient),
    record_service: RecordService = Depends(get_record_service),
    db: AsyncSession = Depends(get_db),
):
    """Get all medical records for a patient the calling specialist has access to."""
    records = await record_service.get_patient_records(access["patient_profile"]["id"])
    specialist_user_id = access["specialist_user_id"]
    patient_user_id = access["patient_profile"]["user_id"]
    key_blob = await SqlAlchemyABEKeyRepository(db).get_active_key(
        specialist_user_id, patient_user_id
    )
    return [record_service.decrypt_as_specialist(r, key_blob) for r in records]


@router.get("/{record_id}", response_model=MedicalRecordRead)
async def get_record(
    record_id: str,
    current_user: dict = Depends(require_role(UserRole.PATIENT)),
    record_service: RecordService = Depends(get_record_service),
    db: AsyncSession = Depends(get_db),
):
    """Fetch a single medical record by ID. Only the owning patient may access it."""
    record = await record_service.record_repo.find_by_id(record_id)
    if not record:
        raise NotFoundException("Medical record", record_id)

    patient_profile = await SqlAlchemyPatientRepository(db).get_by_id(record["patient_id"])
    if not patient_profile or str(patient_profile["user_id"]) != current_user["id"]:
        raise ForbiddenException("You do not have access to this record.")

    return record_service.decrypt_as_owner(record)


@router.get("/{record_id}/specialist", response_model=MedicalRecordRead)
async def get_record_specialist(
    record_id: str,
    current_user: dict = Depends(require_role([UserRole.DOCTOR, UserRole.NUTRITIONIST, UserRole.COACH])),
    record_service: RecordService = Depends(get_record_service),
    db: AsyncSession = Depends(get_db),
):
    """Fetch a single record as a specialist. Requires an APPROVED relation with the patient."""
    record = await record_service.record_repo.find_by_id(record_id)
    if not record:
        raise NotFoundException("Medical record", record_id)

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

    key_blob = await SqlAlchemyABEKeyRepository(db).get_active_key(
        specialist_id, patient_profile["user_id"]
    )
    return record_service.decrypt_as_specialist(record, key_blob)

