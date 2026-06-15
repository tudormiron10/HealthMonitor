"""Plan endpoints — patient list, archive, and unarchive."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from api.dependencies import get_current_user, get_db, require_role
from api.routes.schemas.plan_schemas import PlanArchiveResponse, PlanRead
from application.plan_service import PlanService
from application.report_service import ReportService
from core.exceptions import ForbiddenException, NotFoundException
from infrastructure.persistence.models.enums import MessageKind
from infrastructure.persistence.models.enums import UserRole
from infrastructure.persistence.repositories.conversation_repository import SqlAlchemyConversationRepository
from infrastructure.persistence.repositories.message_repository import SqlAlchemyMessageRepository
from infrastructure.persistence.repositories.patient_repository import SqlAlchemyPatientRepository
from infrastructure.persistence.repositories.specialist_repository import SqlAlchemySpecialistRepository
from infrastructure.persistence.repositories.user_plan_archive_repository import SqlAlchemyUserPlanArchiveRepository
from infrastructure.persistence.repositories.user_repository import SqlAlchemyUserRepository

router = APIRouter(prefix="/plans", tags=["Plans"])


def _get_plan_service(db: AsyncSession = Depends(get_db)) -> PlanService:
    return PlanService(
        message_repo=SqlAlchemyMessageRepository(db),
        conversation_repo=SqlAlchemyConversationRepository(db),
        user_repo=SqlAlchemyUserRepository(db),
        specialist_repo=SqlAlchemySpecialistRepository(db),
        patient_repo=SqlAlchemyPatientRepository(db),
        archive_repo=SqlAlchemyUserPlanArchiveRepository(db),
    )


@router.get("/sent", response_model=list[PlanRead], dependencies=[Depends(require_role([UserRole.NUTRITIONIST, UserRole.COACH]))])
async def list_sent_plans(
    include_archived: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: PlanService = Depends(_get_plan_service),
) -> list[PlanRead]:
    """Return all plans sent by the authenticated specialist (NUTRITIONIST or COACH)."""
    rows = await service.list_sent(
        specialist_user_id=current_user["id"],
        include_archived=include_archived,
    )
    await db.commit()
    return [PlanRead(**r) for r in rows]


@router.get("/my", response_model=list[PlanRead], dependencies=[Depends(require_role([UserRole.PATIENT]))])
async def list_my_plans(
    include_archived: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: PlanService = Depends(_get_plan_service),
) -> list[PlanRead]:
    """Return all plans received by the authenticated patient."""
    rows = await service.list_my(
        patient_user_id=current_user["id"],
        include_archived=include_archived,
    )
    await db.commit()
    return [PlanRead(**r) for r in rows]


@router.patch("/{message_id}/archive", response_model=PlanArchiveResponse)
async def archive_plan(
    message_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: PlanService = Depends(_get_plan_service),
) -> PlanArchiveResponse:
    """Archive a plan for the calling user."""
    await service.archive(caller_user_id=current_user["id"], message_id=message_id)
    await db.commit()
    return PlanArchiveResponse(message_id=message_id, archived=True)


@router.get("/{message_id}/pdf")
async def download_plan_pdf(
    message_id: UUID,
    lang: str = Query("ro", pattern="^(ro|en)$"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: PlanService = Depends(_get_plan_service),
) -> Response:
    """Download a plan as a PDF. Accessible by the recipient patient or the sending specialist."""
    repo = SqlAlchemyMessageRepository(db)
    row = await repo.get_plan_message_with_conversation(message_id)
    if row is None or row["message_kind"] not in (MessageKind.MEAL_PLAN, MessageKind.WORKOUT_PLAN):
        raise NotFoundException("Plan", str(message_id))

    caller_id = str(current_user["id"])
    is_patient = str(row["patient_user_id"]) == caller_id
    is_sender = row["sender_id"] is not None and str(row["sender_id"]) == caller_id
    if not (is_patient or is_sender):
        raise ForbiddenException("Access denied.")

    sender_name = await service._resolve_specialist_name(row.get("sender_id"))
    payload = row.get("payload") or {}
    plan = {
        "plan_type": row["message_kind"].value if hasattr(row["message_kind"], "value") else str(row["message_kind"]),
        "title": row["message_text"],
        "content": payload.get("content", ""),
        "sender_name": sender_name,
        "sent_at": row["sent_at"].isoformat() if hasattr(row["sent_at"], "isoformat") else str(row["sent_at"]),
    }

    pdf_bytes = ReportService().generate_plan_pdf(plan, language=lang)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="healthmonitor_plan_{message_id}.pdf"'},
    )


@router.patch("/{message_id}/unarchive", response_model=PlanArchiveResponse)
async def unarchive_plan(
    message_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: PlanService = Depends(_get_plan_service),
) -> PlanArchiveResponse:
    """Restore an archived plan for the calling user."""
    await service.unarchive(caller_user_id=current_user["id"], message_id=message_id)
    await db.commit()
    return PlanArchiveResponse(message_id=message_id, archived=False)
