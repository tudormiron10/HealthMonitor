"""Admin business logic: platform stats, user management, and specialist verification."""

import logging
from datetime import datetime, timezone
from uuid import UUID

from core.exceptions import ForbiddenException, NotFoundException
from domain.ports.notification_service import NotificationService
from domain.ports.prediction_repository import PredictionRepository
from domain.ports.record_repository import RecordRepository
from domain.ports.relation_repository import RelationRepository
from domain.ports.specialist_repository import SpecialistRepository
from domain.ports.user_repository import UserRepository
from infrastructure.persistence.models.enums import RelationStatus, UserRole, VerificationStatus

logger = logging.getLogger(__name__)

_SPECIALIST_ROLES = (UserRole.DOCTOR, UserRole.NUTRITIONIST, UserRole.COACH)


class AdminService:
    """Orchestrates admin operations across users, specialists, and relations."""

    def __init__(
        self,
        user_repo: UserRepository,
        specialist_repo: SpecialistRepository,
        relation_repo: RelationRepository,
        record_repo: RecordRepository,
        prediction_repo: PredictionRepository,
        notification_service: NotificationService,
    ):
        self.user_repo = user_repo
        self.specialist_repo = specialist_repo
        self.relation_repo = relation_repo
        self.record_repo = record_repo
        self.prediction_repo = prediction_repo
        self.notification_service = notification_service

    async def get_platform_stats(self) -> dict:
        """Aggregate key platform metrics for admin dashboard."""
        total_nutritionists = await self.user_repo.count_users(UserRole.NUTRITIONIST.value, None)
        total_coaches = await self.user_repo.count_users(UserRole.COACH.value, None)

        return {
            "total_patients": await self.user_repo.count_users(UserRole.PATIENT.value, None),
            "total_doctors": await self.user_repo.count_users(UserRole.DOCTOR.value, None),
            "total_nutritionists_coaches": total_nutritionists + total_coaches,
            "pending_verifications": await self.user_repo.count_users(
                None, VerificationStatus.PENDING_VERIFICATION.value
            ),
            "total_medical_records": await self.record_repo.count_all(),
            "total_ml_predictions": await self.prediction_repo.count_all(),
            "active_relations": await self.relation_repo.count_by_status(RelationStatus.APPROVED.value),
        }

    async def list_users(
        self,
        role_filter: str | None,
        search_query: str | None,
        offset: int,
        limit: int,
    ) -> list[dict]:
        """List users with optional role filtering and search, for admin user management."""
        return await self.user_repo.list_all(role_filter, search_query, offset, limit)

    async def toggle_user_active(self, target_user_id: UUID, admin_user_id: UUID) -> dict:
        user = await self.user_repo.get_by_id(target_user_id)
        if user is None:
            raise NotFoundException("User", str(target_user_id))

        if user["role"] == UserRole.ADMIN:
            raise ForbiddenException("Cannot deactivate an admin account.")

        new_active = not user["is_active"]
        updated = await self.user_repo.set_active(target_user_id, new_active)

        if not new_active and user["role"] in _SPECIALIST_ROLES:
            await self.relation_repo.revoke_all_for_specialist(target_user_id)

        return updated

    async def get_pending_specialists(self) -> list[dict]:
        """List all pending specialists for admin review."""
        users = await self.user_repo.list_all(
            role_filter=None,
            search_query=None,
            offset=0,
            limit=500,
            verification_status_filter=VerificationStatus.PENDING_VERIFICATION.value,
        )
        result = []
        for user in users:
            profile = await self.specialist_repo.get_by_user_id(user["id"])
            if profile:
                result.append({**user, **profile})
        return result

    async def approve_specialist(self, specialist_user_id: UUID, admin_user_id: UUID) -> None:
        """Approve a pending specialist, updating their status and sending notification."""
        user = await self.user_repo.get_by_id(specialist_user_id)
        if user is None:
            raise NotFoundException("User", str(specialist_user_id))

        await self.user_repo.update_verification_status(
            specialist_user_id, VerificationStatus.APPROVED.value
        )
        await self.specialist_repo.update(specialist_user_id, {
            "verified_at": datetime.now(timezone.utc),
            "verified_by_admin_id": admin_user_id,
        })

        profile = await self.specialist_repo.get_by_user_id(specialist_user_id)
        first_name = profile["first_name"] if profile else ""
        try:
            await self.notification_service.send_verification_approved(user["email"], first_name)
        except Exception as exc:
            logger.warning("Approval email failed for %s: %s", user["email"], exc)

    async def reject_specialist(
        self, specialist_user_id: UUID, admin_user_id: UUID, reason: str
    ) -> None:
        """Reject a pending specialist, updating their status and sending notification with reason."""
        user = await self.user_repo.get_by_id(specialist_user_id)
        if user is None:
            raise NotFoundException("User", str(specialist_user_id))

        await self.user_repo.update_verification_status(
            specialist_user_id, VerificationStatus.REJECTED.value
        )
        await self.specialist_repo.update(specialist_user_id, {"rejection_reason": reason})

        profile = await self.specialist_repo.get_by_user_id(specialist_user_id)
        first_name = profile["first_name"] if profile else ""
        try:
            await self.notification_service.send_verification_rejected(
                user["email"], first_name, reason
            )
        except Exception as exc:
            logger.warning("Rejection email failed for %s: %s", user["email"], exc)

    async def get_specialist_profile(self, specialist_user_id: UUID) -> dict:
        """Get combined user and specialist profile for a given specialist user ID."""
        user = await self.user_repo.get_by_id(specialist_user_id)
        if user is None:
            raise NotFoundException("User", str(specialist_user_id))
        profile = await self.specialist_repo.get_by_user_id(specialist_user_id)
        if not profile:
            raise NotFoundException("SpecialistProfile", str(specialist_user_id))
        return {**user, **profile}

    async def resubmit_verification(self, specialist_user_id: UUID) -> None:
        """Allow a rejected specialist to resubmit for verification, resetting status and reason."""
        user = await self.user_repo.get_by_id(specialist_user_id)
        if user is None:
            raise NotFoundException("User", str(specialist_user_id))

        await self.user_repo.update_verification_status(
            specialist_user_id, VerificationStatus.PENDING_VERIFICATION.value
        )
        await self.specialist_repo.update(specialist_user_id, {"rejection_reason": None})
