"""Unit tests for AdminService — stats, user management guards, verification."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from application.admin_service import AdminService
from core.exceptions import ForbiddenException, NotFoundException
from infrastructure.persistence.models.enums import RelationStatus, UserRole, VerificationStatus
from tests.builders import make_relation, make_user
from tests.fakes import FakeRelationRepository, FakeSpecialistRepository, FakeUserRepository


@pytest.fixture
def ctx():
    user_repo = FakeUserRepository()
    specialist_repo = FakeSpecialistRepository()
    relation_repo = FakeRelationRepository()
    record_repo = AsyncMock()
    record_repo.count_all.return_value = 0
    prediction_repo = AsyncMock()
    prediction_repo.count_all.return_value = 0
    notification = AsyncMock()
    service = AdminService(
        user_repo=user_repo,
        specialist_repo=specialist_repo,
        relation_repo=relation_repo,
        record_repo=record_repo,
        prediction_repo=prediction_repo,
        notification_service=notification,
    )
    return SimpleNamespace(
        service=service,
        user_repo=user_repo,
        specialist_repo=specialist_repo,
        relation_repo=relation_repo,
        record_repo=record_repo,
        prediction_repo=prediction_repo,
        notification=notification,
    )


class TestGetPlatformStats:
    async def test_given_seeded_data_when_get_stats_then_aggregates_counts(self, ctx):
        # Arrange
        ctx.user_repo.seed(make_user(role=UserRole.PATIENT))
        ctx.user_repo.seed(make_user(role=UserRole.PATIENT))
        ctx.user_repo.seed(make_user(role=UserRole.DOCTOR))
        ctx.user_repo.seed(make_user(role=UserRole.NUTRITIONIST, verification_status=VerificationStatus.PENDING_VERIFICATION))
        ctx.user_repo.seed(make_user(role=UserRole.COACH))
        ctx.relation_repo.seed(make_relation(status=RelationStatus.APPROVED))
        ctx.relation_repo.seed(make_relation(status=RelationStatus.APPROVED))
        ctx.record_repo.count_all.return_value = 5
        ctx.prediction_repo.count_all.return_value = 3

        # Act
        stats = await ctx.service.get_platform_stats()

        # Assert
        assert stats["total_patients"] == 2
        assert stats["total_doctors"] == 1
        assert stats["total_nutritionists_coaches"] == 2
        assert stats["pending_verifications"] == 1
        assert stats["total_medical_records"] == 5
        assert stats["total_ml_predictions"] == 3
        assert stats["active_relations"] == 2


class TestToggleUserActive:
    async def test_given_active_patient_when_toggle_then_deactivated(self, ctx):
        # Arrange
        user = ctx.user_repo.seed(make_user(role=UserRole.PATIENT, is_active=True))

        # Act
        result = await ctx.service.toggle_user_active(user["id"], uuid.uuid4())

        # Assert
        assert result["is_active"] is False

    async def test_given_specialist_when_deactivated_then_relations_revoked(self, ctx):
        # Arrange
        doctor = ctx.user_repo.seed(make_user(role=UserRole.DOCTOR, is_active=True))
        relation = ctx.relation_repo.seed(
            make_relation(specialist_id=doctor["id"], status=RelationStatus.APPROVED)
        )

        # Act
        await ctx.service.toggle_user_active(doctor["id"], uuid.uuid4())

        # Assert
        assert ctx.relation_repo.rows[relation["id"]]["status"] == RelationStatus.REVOKED

    async def test_given_admin_user_when_toggle_then_raises_forbidden(self, ctx):
        # Arrange
        admin = ctx.user_repo.seed(make_user(role=UserRole.ADMIN, is_active=True))

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await ctx.service.toggle_user_active(admin["id"], uuid.uuid4())

    async def test_given_missing_user_when_toggle_then_raises_notfound(self, ctx):
        # Act + Assert
        with pytest.raises(NotFoundException):
            await ctx.service.toggle_user_active(uuid.uuid4(), uuid.uuid4())


class TestVerification:
    def _seed_specialist(self, ctx, status=VerificationStatus.PENDING_VERIFICATION):
        user = ctx.user_repo.seed(make_user(role=UserRole.DOCTOR, verification_status=status))
        ctx.specialist_repo.seed(
            {"id": uuid.uuid4(), "user_id": user["id"], "first_name": "Doc", "last_name": "Tor"}
        )
        return user

    async def test_given_pending_specialist_when_approve_then_status_approved(self, ctx):
        # Arrange
        user = self._seed_specialist(ctx)

        # Act
        await ctx.service.approve_specialist(user["id"], uuid.uuid4())

        # Assert
        assert ctx.user_repo.rows[user["id"]]["verification_status"] == VerificationStatus.APPROVED.value
        ctx.notification.send_verification_approved.assert_awaited()

    async def test_given_specialist_when_reject_then_status_rejected_with_reason(self, ctx):
        # Arrange
        user = self._seed_specialist(ctx)

        # Act
        await ctx.service.reject_specialist(user["id"], uuid.uuid4(), "incomplete documents")

        # Assert
        assert ctx.user_repo.rows[user["id"]]["verification_status"] == VerificationStatus.REJECTED.value
        profile = await ctx.specialist_repo.get_by_user_id(user["id"])
        assert profile["rejection_reason"] == "incomplete documents"

    async def test_given_failing_email_when_approve_then_still_succeeds(self, ctx):
        # Arrange — the approval email blows up but must not block approval
        user = self._seed_specialist(ctx)
        ctx.notification.send_verification_approved.side_effect = Exception("smtp down")

        # Act — must not raise
        await ctx.service.approve_specialist(user["id"], uuid.uuid4())

        # Assert
        assert ctx.user_repo.rows[user["id"]]["verification_status"] == VerificationStatus.APPROVED.value

    async def test_given_pending_specialists_when_list_then_merges_profile(self, ctx):
        # Arrange
        user = self._seed_specialist(ctx)

        # Act
        result = await ctx.service.get_pending_specialists()

        # Assert
        assert len(result) == 1
        assert result[0]["user_id"] == user["id"]
        assert result[0]["first_name"] == "Doc"
