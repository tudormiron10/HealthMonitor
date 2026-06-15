"""Unit tests for NotificationService — red-flag fan-out to linked specialists."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from application.chat_service import ChatService
from application.conversation_service import ConversationService
from application.notification_service import NotificationService
from infrastructure.persistence.models.enums import MessageKind, RelationStatus
from tests.builders import make_relation
from tests.fakes import (
    FakeConversationRepository,
    FakeMessageRepository,
    FakeRelationRepository,
    FakeUserRepository,
)


@pytest.fixture
def ctx():
    relation_repo = FakeRelationRepository()
    conversation_repo = FakeConversationRepository()
    message_repo = FakeMessageRepository()
    user_repo = FakeUserRepository()
    conv_service = ConversationService(
        conversation_repo=conversation_repo,
        relation_repo=relation_repo,
        user_repo=user_repo,
        message_repo=message_repo,
    )
    chat_service = ChatService(message_repo=message_repo, conversation_service=conv_service)
    chat_manager = AsyncMock()
    service = NotificationService(
        relation_repo=relation_repo,
        conversation_service=conv_service,
        chat_service=chat_service,
        chat_manager=chat_manager,
    )
    return SimpleNamespace(
        service=service, relation_repo=relation_repo, message_repo=message_repo,
        chat_manager=chat_manager,
    )


def _approved_pair(ctx):
    patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
    ctx.relation_repo.seed(
        make_relation(patient_id=patient_id, specialist_id=specialist_id, status=RelationStatus.APPROVED)
    )
    return patient_id, specialist_id


async def _notify(ctx, patient_id, predictions):
    await ctx.service.notify_red_flag(
        patient_user_id=patient_id,
        record_id=uuid.uuid4(),
        prediction_id=uuid.uuid4(),
        predictions=predictions,
    )


class TestNotifyRedFlag:
    async def test_given_no_condition_over_threshold_when_notify_then_noop(self, ctx):
        # Arrange
        patient_id, _ = _approved_pair(ctx)

        # Act
        await _notify(ctx, patient_id, {"anemie": {"probability": 0.3}})

        # Assert — nothing persisted or broadcast
        assert ctx.message_repo.rows == []
        ctx.chat_manager.broadcast_to_conversation.assert_not_awaited()

    async def test_given_flag_but_no_approved_specialist_when_notify_then_noop(self, ctx):
        # Arrange — flagged condition but the patient has no APPROVED relations
        patient_id = uuid.uuid4()

        # Act
        await _notify(ctx, patient_id, {"anemie": {"probability": 0.9}})

        # Assert
        assert ctx.message_repo.rows == []
        ctx.chat_manager.broadcast_to_user.assert_not_awaited()

    async def test_given_flag_and_approved_specialist_when_notify_then_persists_system_message(self, ctx):
        # Arrange
        patient_id, _ = _approved_pair(ctx)

        # Act
        await _notify(ctx, patient_id, {"anemie": {"probability": 0.9}})

        # Assert
        assert len(ctx.message_repo.rows) == 1
        msg = ctx.message_repo.rows[0]
        assert msg["message_kind"] == MessageKind.SYSTEM_RED_FLAG
        assert msg["sender_id"] is None

    async def test_given_flag_and_approved_specialist_when_notify_then_broadcasts_both_channels(self, ctx):
        # Arrange
        patient_id, specialist_id = _approved_pair(ctx)

        # Act
        await _notify(ctx, patient_id, {"anemie": {"probability": 0.9}})

        # Assert — conversation room + the specialist's user socket
        ctx.chat_manager.broadcast_to_conversation.assert_awaited()
        ctx.chat_manager.broadcast_to_user.assert_awaited()
        user_payload = ctx.chat_manager.broadcast_to_user.await_args.args[1]
        assert user_payload["type"] == "red_flag_toast"

    async def test_given_multiple_flagged_conditions_when_notify_then_payload_lists_all(self, ctx):
        # Arrange
        patient_id, _ = _approved_pair(ctx)

        # Act
        await _notify(ctx, patient_id, {"anemie": {"probability": 0.9}, "diabet": {"probability": 0.8}})

        # Assert
        msg = ctx.message_repo.rows[0]
        assert set(msg["payload"]["conditions"]) == {"anemie", "diabet"}
