"""Admin Panel and specialist verification endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from api.dependencies import get_db, require_role
from api.routes.schemas.admin_schemas import (
    PlatformStatsResponse,
    RejectRequest,
    SpecialistPendingRead,
    UserAdminRead,
)
from application.admin_service import AdminService
from core.config import get_settings
from infrastructure.notifications.email_service import EmailNotificationService
from infrastructure.persistence.models.enums import UserRole
from infrastructure.persistence.repositories.prediction_repository import SqlAlchemyPredictionRepository
from infrastructure.persistence.repositories.record_repository import SqlAlchemyRecordRepository
from infrastructure.persistence.repositories.relation_repository import SqlAlchemyRelationRepository
from infrastructure.persistence.repositories.specialist_repository import SqlAlchemySpecialistRepository
from infrastructure.persistence.repositories.user_repository import SqlAlchemyUserRepository

router = APIRouter(tags=["Admin"])

_SPECIALIST_ROLES = [UserRole.DOCTOR, UserRole.NUTRITIONIST, UserRole.COACH]


def get_admin_service(db: AsyncSession = Depends(get_db)) -> AdminService:
    settings = get_settings()
    return AdminService(
        user_repo=SqlAlchemyUserRepository(db),
        specialist_repo=SqlAlchemySpecialistRepository(db),
        relation_repo=SqlAlchemyRelationRepository(db),
        record_repo=SqlAlchemyRecordRepository(db),
        prediction_repo=SqlAlchemyPredictionRepository(db),
        notification_service=EmailNotificationService(settings),
    )


@router.get("/admin/stats", response_model=PlatformStatsResponse)
async def get_stats(
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
    service: AdminService = Depends(get_admin_service),
):
    """Return platform statistics for the admin dashboard."""
    return await service.get_platform_stats()


@router.get("/admin/users", response_model=list[UserAdminRead])
async def list_users(
    role: str | None = Query(None),
    search: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
    service: AdminService = Depends(get_admin_service),
):
    """List users with optional role and search filters, supporting pagination."""
    return await service.list_users(role, search, offset, limit)


@router.patch("/admin/users/{user_id}/toggle-active", response_model=UserAdminRead)
async def toggle_user_active(
    user_id: UUID,
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
    service: AdminService = Depends(get_admin_service),
    db: AsyncSession = Depends(get_db),
):
    """Toggle the active status of a user."""
    result = await service.toggle_user_active(user_id, UUID(current_user["id"]))
    await db.commit()
    return result


@router.get("/admin/specialists/pending", response_model=list[SpecialistPendingRead])
async def get_pending_specialists(
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
    service: AdminService = Depends(get_admin_service),
):
    """Return a list of pending specialists."""
    return await service.get_pending_specialists()


@router.post("/admin/specialists/{user_id}/approve", status_code=200)
async def approve_specialist(
    request: Request,
    user_id: UUID,
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
    service: AdminService = Depends(get_admin_service),
    db: AsyncSession = Depends(get_db),
):
    """Approve a pending specialist."""
    await service.approve_specialist(user_id, UUID(current_user["id"]))
    await db.commit()
    try:
        await request.app.state.chat_manager.broadcast_to_user(
            user_id,
            {"type": "verification_status_changed", "status": "APPROVED"},
        )
    except Exception:
        pass
    return {"message": "Specialist approved."}


@router.post("/admin/specialists/{user_id}/reject", status_code=200)
async def reject_specialist(
    request: Request,
    user_id: UUID,
    body: RejectRequest,
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
    service: AdminService = Depends(get_admin_service),
    db: AsyncSession = Depends(get_db),
):
    """Reject a pending specialist."""
    await service.reject_specialist(user_id, UUID(current_user["id"]), body.reason)
    await db.commit()
    try:
        await request.app.state.chat_manager.broadcast_to_user(
            user_id,
            {"type": "verification_status_changed", "status": "REJECTED", "reason": body.reason},
        )
    except Exception:
        pass
    return {"message": "Specialist rejected."}


@router.get("/admin/specialists/{user_id}/profile", response_model=SpecialistPendingRead)
async def get_specialist_profile(
    user_id: UUID,
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
    service: AdminService = Depends(get_admin_service),
):
    """Return the profile of a specialist."""
    return await service.get_specialist_profile(user_id)


@router.post("/specialists/resubmit-verification", status_code=200)
async def resubmit_verification(
    request: Request,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    service: AdminService = Depends(get_admin_service),
    db: AsyncSession = Depends(get_db),
):
    """Allow a specialist to resubmit their verification request after a rejection."""
    await service.resubmit_verification(UUID(current_user["id"]))
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

    return {"message": "Verification resubmitted."}
