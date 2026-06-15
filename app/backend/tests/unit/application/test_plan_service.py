"""Unit tests for PlanService — listing, archive/unarchive, ownership, naming."""

import uuid
from datetime import datetime, timezone

import pytest

from application.plan_service import PlanService
from core.exceptions import ForbiddenException, NotFoundException
from infrastructure.persistence.models.enums import MessageKind
from tests.fakes import (
    FakeConversationRepository,
    FakeMessageRepository,
    FakePatientRepository,
    FakeSpecialistRepository,
    FakeUserRepository,
)
from tests.fakes.fake_user_plan_archive_repository import FakeUserPlanArchiveRepository


def _plan_row(patient_user_id, sender_id, kind=MessageKind.MEAL_PLAN, title="Plan", content="eat"):
    return {
        "id": uuid.uuid4(),
        "conversation_id": uuid.uuid4(),
        "message_kind": kind,
        "message_text": title,
        "payload": {"title": title, "content": content},
        "sender_id": sender_id,
        "patient_user_id": patient_user_id,
        "sent_at": datetime.now(timezone.utc),
        "is_read": True,
    }


@pytest.fixture
def ctx():
    from types import SimpleNamespace
    message_repo = FakeMessageRepository()
    archive_repo = FakeUserPlanArchiveRepository()
    user_repo = FakeUserRepository()
    specialist_repo = FakeSpecialistRepository()
    patient_repo = FakePatientRepository()
    service = PlanService(
        message_repo=message_repo,
        conversation_repo=FakeConversationRepository(),
        user_repo=user_repo,
        specialist_repo=specialist_repo,
        patient_repo=patient_repo,
        archive_repo=archive_repo,
    )
    return SimpleNamespace(
        service=service, message_repo=message_repo, archive_repo=archive_repo,
        user_repo=user_repo, specialist_repo=specialist_repo, patient_repo=patient_repo,
    )


class TestListMy:
    async def test_given_patient_plan_when_list_my_then_returns_enriched_with_sender_name(self, ctx):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        ctx.specialist_repo.seed({"id": uuid.uuid4(), "user_id": specialist_id, "first_name": "Nutri", "last_name": "Tion"})
        ctx.message_repo.seed(_plan_row(patient_id, specialist_id, content="eat veggies"))

        # Act
        result = await ctx.service.list_my(patient_id, include_archived=False)

        # Assert
        assert len(result) == 1
        assert result[0]["sender_name"] == "Nutri Tion"
        assert result[0]["plan_type"] == MessageKind.MEAL_PLAN
        assert result[0]["content"] == "eat veggies"

    async def test_given_archived_plan_when_list_my_excludes_unless_requested(self, ctx):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        row = ctx.message_repo.seed(_plan_row(patient_id, specialist_id))
        await ctx.archive_repo.archive(patient_id, row["id"])

        # Act + Assert
        assert await ctx.service.list_my(patient_id, include_archived=False) == []
        with_archived = await ctx.service.list_my(patient_id, include_archived=True)
        assert len(with_archived) == 1
        assert with_archived[0]["is_archived"] is True

    async def test_given_missing_specialist_profile_when_list_my_then_name_falls_back_to_email(self, ctx):
        # Arrange — no specialist profile; sender resolvable only via users.email
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        ctx.user_repo.seed({"id": specialist_id, "email": "doc@gmail.com", "role": "NUTRITIONIST"})
        ctx.message_repo.seed(_plan_row(patient_id, specialist_id))

        # Act
        result = await ctx.service.list_my(patient_id, include_archived=False)

        # Assert
        assert result[0]["sender_name"] == "doc@gmail.com"


class TestListSent:
    async def test_given_specialist_plan_when_list_sent_then_returns_patient_name(self, ctx):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        ctx.patient_repo.seed({"id": uuid.uuid4(), "user_id": patient_id, "first_name": "Pa", "last_name": "Tient"})
        ctx.message_repo.seed(_plan_row(patient_id, specialist_id))

        # Act
        result = await ctx.service.list_sent(specialist_id, include_archived=False)

        # Assert
        assert len(result) == 1
        assert result[0]["sender_name"] == "Pa Tient"


class TestArchive:
    async def test_given_owner_when_archive_then_recorded(self, ctx):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        row = ctx.message_repo.seed(_plan_row(patient_id, specialist_id))

        # Act
        await ctx.service.archive(caller_user_id=patient_id, message_id=row["id"])

        # Assert
        assert (patient_id, row["id"]) in ctx.archive_repo.archived

    async def test_given_non_party_when_archive_then_raises_forbidden(self, ctx):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        row = ctx.message_repo.seed(_plan_row(patient_id, specialist_id))

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await ctx.service.archive(caller_user_id=uuid.uuid4(), message_id=row["id"])

    async def test_given_non_plan_message_when_archive_then_raises_forbidden(self, ctx):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        row = ctx.message_repo.seed(_plan_row(patient_id, specialist_id, kind=MessageKind.TEXT))

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await ctx.service.archive(caller_user_id=patient_id, message_id=row["id"])

    async def test_given_missing_message_when_archive_then_raises_notfound(self, ctx):
        # Act + Assert
        with pytest.raises(NotFoundException):
            await ctx.service.archive(caller_user_id=uuid.uuid4(), message_id=uuid.uuid4())
