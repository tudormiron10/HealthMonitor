"""Specialist Profile endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Request, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from api.dependencies import (
    get_certification_service,
    get_current_user,
    get_db,
    get_education_service,
    get_work_experience_service,
    require_role,
)
from api.routes.schemas.relation_schemas import CounterpartyRead, RelationRead
from api.routes.schemas.specialist_schemas import (
    CertificationCreate,
    CertificationRead,
    CertificationUpdate,
    EducationCreate,
    EducationRead,
    EducationUpdate,
    PatientCardRead,
    PhotoUploadResponse,
    PublicSpecialistProfileRead,
    SpecialistDetailsUpdate,
    SpecialistProfileFullRead,
    SpecialistProfileRead,
    SpecialistProfileUpdate,
    WorkExperienceCreate,
    WorkExperienceRead,
    WorkExperienceUpdate,
)
from application.certification_service import CertificationService
from application.education_service import EducationService
from application.relation_service import RelationService
from application.specialist_service import SpecialistService
from application.work_experience_service import WorkExperienceService
from infrastructure.persistence.models.enums import UserRole
from infrastructure.persistence.repositories.certification_repository import SqlAlchemyCertificationRepository
from infrastructure.persistence.repositories.education_repository import SqlAlchemyEducationRepository
from infrastructure.persistence.repositories.patient_repository import SqlAlchemyPatientRepository
from infrastructure.persistence.repositories.prediction_repository import SqlAlchemyPredictionRepository
from infrastructure.persistence.repositories.relation_repository import SqlAlchemyRelationRepository
from infrastructure.persistence.repositories.specialist_repository import SqlAlchemySpecialistRepository
from infrastructure.persistence.repositories.user_repository import SqlAlchemyUserRepository
from infrastructure.persistence.repositories.work_experience_repository import SqlAlchemyWorkExperienceRepository

router = APIRouter(prefix="/specialists", tags=["Specialists"])

_SPECIALIST_ROLES = [UserRole.DOCTOR, UserRole.NUTRITIONIST, UserRole.COACH]

from core.constants import RED_FLAG_THRESHOLD as _RED_FLAG_THRESHOLD


def get_specialist_service(db: AsyncSession = Depends(get_db)) -> SpecialistService:
    repo = SqlAlchemySpecialistRepository(db)
    return SpecialistService(repo)


async def _build_full_response(
    profile: dict,
    db: AsyncSession,
) -> SpecialistProfileFullRead:
    """Fetch sub-entities, compute headline, and assemble SpecialistProfileFullRead."""
    profile_id = profile["id"]

    work_exp = await SqlAlchemyWorkExperienceRepository(db).list_for_specialist(profile_id)
    education = await SqlAlchemyEducationRepository(db).list_for_specialist(profile_id)
    certifications = await SqlAlchemyCertificationRepository(db).list_for_specialist(profile_id)

    latest_workplace = next(
        (e["employer"] for e in work_exp if e.get("end_date") is None),
        None,
    )
    headline = SpecialistService.compute_headline(profile, latest_workplace)

    return SpecialistProfileFullRead(
        **profile,
        work_experience=[WorkExperienceRead(**e) for e in work_exp],
        education=[EducationRead(**e) for e in education],
        certifications=[CertificationRead(**e) for e in certifications],
        headline=headline,
    )


@router.get("/me", response_model=SpecialistProfileFullRead)
async def get_my_specialist_profile(
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    specialist_service: SpecialistService = Depends(get_specialist_service),
    db: AsyncSession = Depends(get_db),
):
    """Get the full profile of the currently logged-in specialist."""
    profile = await specialist_service.get_my_profile(UUID(current_user["id"]))
    return await _build_full_response(profile, db)


@router.put("/me", response_model=SpecialistProfileRead)
async def update_my_specialist_profile(
    update_data: SpecialistProfileUpdate,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    specialist_service: SpecialistService = Depends(get_specialist_service),
    db: AsyncSession = Depends(get_db),
):
    """Update basic profile details for the currently logged-in specialist."""
    result = await specialist_service.update_my_profile(current_user["id"], update_data)
    await db.commit()
    return result


@router.post("/me/photo", response_model=PhotoUploadResponse)
async def upload_my_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    specialist_service: SpecialistService = Depends(get_specialist_service),
    db: AsyncSession = Depends(get_db),
):
    """Upload or replace the profile photo for the currently logged-in specialist."""
    photo_url = await specialist_service.upload_photo(UUID(current_user["id"]), file)
    await db.commit()
    return PhotoUploadResponse(photo_url=photo_url)


@router.delete("/me/photo", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_photo(
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    specialist_service: SpecialistService = Depends(get_specialist_service),
    db: AsyncSession = Depends(get_db),
):
    """Clear the profile photo URL for the currently logged-in specialist."""
    await specialist_service.delete_photo(UUID(current_user["id"]))
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/me/details", response_model=SpecialistProfileFullRead)
async def update_my_extended_details(
    details: SpecialistDetailsUpdate,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    specialist_service: SpecialistService = Depends(get_specialist_service),
    db: AsyncSession = Depends(get_db),
):
    """Update non-credential extended profile fields for the currently logged-in specialist."""
    payload = details.model_dump(mode="json", exclude_unset=True)
    profile = await specialist_service.update_extended_profile(UUID(current_user["id"]), payload)
    await db.commit()
    return await _build_full_response(profile, db)


@router.post("/me/request-reverification", status_code=status.HTTP_200_OK)
async def request_reverification(
    request: Request,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    specialist_service: SpecialistService = Depends(get_specialist_service),
    db: AsyncSession = Depends(get_db),
):
    """Reset verification status to PENDING_VERIFICATION."""
    await specialist_service.request_reverification(UUID(current_user["id"]))
    await db.commit()

    try:
        user_repo = SqlAlchemyUserRepository(db)
        admins = await user_repo.list_all(
            role_filter="ADMIN", search_query=None, offset=0, limit=100
        )
        for admin in admins:
            await request.app.state.chat_manager.broadcast_to_user(
                admin["id"],
                {"type": "new_specialist_registered"},
            )
    except Exception:
        pass


@router.post("/me/work-experience", response_model=WorkExperienceRead, status_code=status.HTTP_201_CREATED)
async def add_work_experience(
    body: WorkExperienceCreate,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    we_service: WorkExperienceService = Depends(get_work_experience_service),
    db: AsyncSession = Depends(get_db),
):
    """Add a new work experience entry for the currently logged-in specialist."""
    result = await we_service.add_mine(UUID(current_user["id"]), body.model_dump())
    await db.commit()
    return result


@router.patch("/me/work-experience/{entry_id}", response_model=WorkExperienceRead)
async def update_work_experience(
    entry_id: UUID,
    body: WorkExperienceUpdate,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    we_service: WorkExperienceService = Depends(get_work_experience_service),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing work experience entry; enforces ownership."""
    result = await we_service.update_mine(UUID(current_user["id"]), entry_id, body.model_dump(exclude_unset=True))
    await db.commit()
    return result


@router.delete("/me/work-experience/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_work_experience(
    entry_id: UUID,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    we_service: WorkExperienceService = Depends(get_work_experience_service),
    db: AsyncSession = Depends(get_db),
):
    """Delete a work experience entry; enforces ownership."""
    await we_service.delete_mine(UUID(current_user["id"]), entry_id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/education", response_model=EducationRead, status_code=status.HTTP_201_CREATED)
async def add_education(
    body: EducationCreate,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    edu_service: EducationService = Depends(get_education_service),
    db: AsyncSession = Depends(get_db),
):
    """Add a new education entry for the currently logged-in specialist."""
    result = await edu_service.add_mine(UUID(current_user["id"]), body.model_dump())
    await db.commit()
    return result


@router.patch("/me/education/{entry_id}", response_model=EducationRead)
async def update_education(
    entry_id: UUID,
    body: EducationUpdate,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    edu_service: EducationService = Depends(get_education_service),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing education entry; enforces ownership."""
    result = await edu_service.update_mine(UUID(current_user["id"]), entry_id, body.model_dump(exclude_unset=True))
    await db.commit()
    return result


@router.delete("/me/education/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_education(
    entry_id: UUID,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    edu_service: EducationService = Depends(get_education_service),
    db: AsyncSession = Depends(get_db),
):
    """Delete an education entry; enforces ownership."""
    await edu_service.delete_mine(UUID(current_user["id"]), entry_id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/certifications", response_model=CertificationRead, status_code=status.HTTP_201_CREATED)
async def add_certification(
    body: CertificationCreate,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    cert_service: CertificationService = Depends(get_certification_service),
    db: AsyncSession = Depends(get_db),
):
    """Add a new certification entry for the currently logged-in specialist."""
    result = await cert_service.add_mine(UUID(current_user["id"]), body.model_dump())
    await db.commit()
    return result


@router.patch("/me/certifications/{entry_id}", response_model=CertificationRead)
async def update_certification(
    entry_id: UUID,
    body: CertificationUpdate,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    cert_service: CertificationService = Depends(get_certification_service),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing certification entry; enforces ownership."""
    result = await cert_service.update_mine(UUID(current_user["id"]), entry_id, body.model_dump(exclude_unset=True))
    await db.commit()
    return result


@router.delete("/me/certifications/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_certification(
    entry_id: UUID,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    cert_service: CertificationService = Depends(get_certification_service),
    db: AsyncSession = Depends(get_db),
):
    """Delete a certification entry; enforces ownership."""
    await cert_service.delete_mine(UUID(current_user["id"]), entry_id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/my-patients", response_model=list[PatientCardRead])
async def get_my_patients(
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Return a summary card for every patient in an APPROVED relation with the caller."""
    user_id = UUID(current_user["id"])
    role = current_user["role"]

    relation_service = RelationService(
        relation_repo=SqlAlchemyRelationRepository(db),
        user_repo=SqlAlchemyUserRepository(db),
    )
    approved = await relation_service.list_approved(user_id, role)
    if not approved:
        return []

    patient_user_ids = [r["patient_id"] for r in approved]
    patient_profiles = await SqlAlchemyPatientRepository(db).get_many_by_user_ids(patient_user_ids)
    if not patient_profiles:
        return []

    patient_profile_ids = [p["id"] for p in patient_profiles]
    latest_predictions = await SqlAlchemyPredictionRepository(db).find_latest_for_patients(
        patient_profile_ids
    )

    cards: list[PatientCardRead] = []
    for profile in patient_profiles:
        pred = latest_predictions.get(profile["id"])

        health_score: int | None = None
        last_update = None
        uploaded_at = None
        red_flags: list[str] = []

        if pred:
            health_score = pred.get("health_score")
            last_update = pred.get("record_date")
            uploaded_at = pred.get("uploaded_at")
            metrics: dict = pred.get("metrics") or {}
            red_flags = [
                cond
                for cond, data in metrics.items()
                if isinstance(data, dict) and (data.get("probability") or 0) >= _RED_FLAG_THRESHOLD
            ]

        cards.append(
            PatientCardRead(
                user_id=profile["user_id"],
                first_name=profile["first_name"],
                last_name=profile["last_name"],
                sex=profile["sex"],
                date_of_birth=profile["date_of_birth"],
                health_score=health_score,
                last_update=last_update,
                uploaded_at=uploaded_at,
                red_flags=red_flags,
            )
        )

    return cards


@router.get("/pending-requests", response_model=list[RelationRead])
async def get_pending_requests(
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Return PENDING relations received by the calling specialist. """
    user_id = UUID(current_user["id"])
    role = current_user["role"]

    relation_service = RelationService(
        relation_repo=SqlAlchemyRelationRepository(db),
        user_repo=SqlAlchemyUserRepository(db),
    )
    pending = await relation_service.list_pending_received(user_id, role)
    if not pending:
        return []

    patient_user_ids = [r["patient_id"] for r in pending]
    patient_profiles = await SqlAlchemyPatientRepository(db).get_many_by_user_ids(patient_user_ids)
    profile_by_user_id = {p["user_id"]: p for p in patient_profiles}

    result: list[RelationRead] = []
    for rel in pending:
        profile = profile_by_user_id.get(rel["patient_id"])
        counterparty = None
        if profile:
            counterparty = CounterpartyRead(
                user_id=rel["patient_id"],
                first_name=profile["first_name"],
                last_name=profile["last_name"],
                role=UserRole.PATIENT,
                specialization=None,
            )
        result.append(
            RelationRead(
                id=rel["id"],
                patient_id=rel["patient_id"],
                specialist_id=rel["specialist_id"],
                status=rel["status"],
                initiated_by=rel["initiated_by"],
                counterparty=counterparty,
            )
        )

    return result


@router.get("/{user_id}/public", response_model=PublicSpecialistProfileRead)
async def get_public_specialist_profile(
    user_id: UUID,
    current_user: dict = Depends(get_current_user),
    specialist_service: SpecialistService = Depends(get_specialist_service),
    db: AsyncSession = Depends(get_db),
):
    """Return the public profile of an APPROVED specialist."""
    profile = await specialist_service.get_public_profile(user_id)

    work_exp = await SqlAlchemyWorkExperienceRepository(db).list_for_specialist(profile["id"])
    education = await SqlAlchemyEducationRepository(db).list_for_specialist(profile["id"])
    certifications = await SqlAlchemyCertificationRepository(db).list_for_specialist(profile["id"])

    latest_workplace = next(
        (e["employer"] for e in work_exp if e.get("end_date") is None),
        None,
    )
    headline = SpecialistService.compute_headline(profile, latest_workplace)

    return PublicSpecialistProfileRead(
        **profile,
        work_experience=[WorkExperienceRead(**e) for e in work_exp],
        education=[EducationRead(**e) for e in education],
        certifications=[CertificationRead(**e) for e in certifications],
        headline=headline,
    )


@router.get("/search", response_model=list[SpecialistProfileRead])
async def search_specialists(
    name: str | None = Query(None, description="Case-insensitive substring matched against first or last name"),
    specialization: str | None = Query(None, description="Exact specialization value"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search specialist profiles by name and/or specialization, paginated."""
    offset = (page - 1) * page_size
    results = await SqlAlchemySpecialistRepository(db).search(
        name=name,
        specialization=specialization,
        offset=offset,
        limit=page_size,
    )
    return [
        {**r, "headline": SpecialistService.compute_headline(r, None)}
        for r in results
    ]
