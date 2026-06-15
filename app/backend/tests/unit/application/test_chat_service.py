"""Unit tests for ChatService — message validation, party gating, plan rules."""

import uuid

import pytest

from core.exceptions import ForbiddenException, NotFoundException, ValidationException
from infrastructure.persistence.models.enums import MessageKind, UserRole
from tests.builders import make_conversation

NUTRITIONIST = UserRole.NUTRITIONIST.value
COACH = UserRole.COACH.value


def _seed_conversation(conversation_repo):
    """Seed a conversation and return (conversation_id, patient_id, specialist_id)."""
    patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
    conv = conversation_repo.seed(
        make_conversation(patient_user_id=patient_id, specialist_user_id=specialist_id)
    )
    return conv["id"], patient_id, specialist_id


class TestSendText:
    async def test_given_valid_text_when_send_then_persists_text_message(
        self, chat_service, conversation_repo, message_repo
    ):
        # Arrange
        conv_id, patient_id, _ = _seed_conversation(conversation_repo)

        # Act
        result = await chat_service.send_text(conv_id, patient_id, "hello")

        # Assert
        assert result["message_kind"] == MessageKind.TEXT
        assert result["message_text"] == "hello"
        assert result["sender_id"] == patient_id
        assert result["conversation_id"] == conv_id
        assert len(message_repo.rows) == 1

    async def test_given_whitespace_text_when_send_then_raises_validation(
        self, chat_service, conversation_repo
    ):
        # Arrange
        conv_id, patient_id, _ = _seed_conversation(conversation_repo)

        # Act + Assert
        with pytest.raises(ValidationException):
            await chat_service.send_text(conv_id, patient_id, "   ")

    async def test_given_text_at_limit_when_send_then_succeeds(
        self, chat_service, conversation_repo
    ):
        # Arrange — exactly 4000 chars is allowed
        conv_id, patient_id, _ = _seed_conversation(conversation_repo)

        # Act
        result = await chat_service.send_text(conv_id, patient_id, "a" * 4000)

        # Assert
        assert len(result["message_text"]) == 4000

    async def test_given_text_over_limit_when_send_then_raises_validation(
        self, chat_service, conversation_repo
    ):
        # Arrange — 4001 chars is rejected
        conv_id, patient_id, _ = _seed_conversation(conversation_repo)

        # Act + Assert
        with pytest.raises(ValidationException):
            await chat_service.send_text(conv_id, patient_id, "a" * 4001)

    async def test_given_non_party_sender_when_send_then_raises_forbidden(
        self, chat_service, conversation_repo
    ):
        # Arrange
        conv_id, _, _ = _seed_conversation(conversation_repo)
        outsider_id = uuid.uuid4()

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await chat_service.send_text(conv_id, outsider_id, "hi")

    async def test_given_missing_conversation_when_send_then_raises_notfound(
        self, chat_service
    ):
        # Act + Assert — no conversation seeded
        with pytest.raises(NotFoundException):
            await chat_service.send_text(uuid.uuid4(), uuid.uuid4(), "hi")


class TestSendSystemRedFlag:
    async def test_given_red_flag_payload_when_send_then_sender_none_and_kind_system(
        self, chat_service, conversation_repo
    ):
        # Arrange
        conv_id, _, _ = _seed_conversation(conversation_repo)
        payload = {"conditions": ["anemie"], "record_id": str(uuid.uuid4())}

        # Act — system messages have no human sender and bypass the party gate
        result = await chat_service.send_system_red_flag(conv_id, payload)

        # Assert
        assert result["sender_id"] is None
        assert result["message_kind"] == MessageKind.SYSTEM_RED_FLAG
        assert result["payload"] == payload


class TestSendPlan:
    async def test_given_nutritionist_when_send_meal_plan_then_persists(
        self, chat_service, conversation_repo
    ):
        # Arrange — the specialist party is the sender
        conv_id, _, specialist_id = _seed_conversation(conversation_repo)

        # Act
        result = await chat_service.send_plan(
            conv_id, specialist_id, NUTRITIONIST, MessageKind.MEAL_PLAN, "Plan", "eat veggies"
        )

        # Assert
        assert result["message_kind"] == MessageKind.MEAL_PLAN
        assert result["message_text"] == "Plan"
        assert result["payload"] == {"title": "Plan", "content": "eat veggies"}

    async def test_given_coach_when_send_workout_plan_then_persists(
        self, chat_service, conversation_repo
    ):
        # Arrange
        conv_id, _, specialist_id = _seed_conversation(conversation_repo)

        # Act
        result = await chat_service.send_plan(
            conv_id, specialist_id, COACH, MessageKind.WORKOUT_PLAN, "Routine", "3x squats"
        )

        # Assert
        assert result["message_kind"] == MessageKind.WORKOUT_PLAN

    async def test_given_nutritionist_when_send_workout_plan_then_raises_forbidden(
        self, chat_service, conversation_repo
    ):
        # Arrange — role↔kind mismatch (nutritionist may only send MEAL_PLAN)
        conv_id, _, specialist_id = _seed_conversation(conversation_repo)

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await chat_service.send_plan(
                conv_id, specialist_id, NUTRITIONIST, MessageKind.WORKOUT_PLAN, "X", "y"
            )

    async def test_given_empty_content_when_send_plan_then_raises_validation(
        self, chat_service, conversation_repo
    ):
        # Arrange
        conv_id, _, specialist_id = _seed_conversation(conversation_repo)

        # Act + Assert
        with pytest.raises(ValidationException):
            await chat_service.send_plan(
                conv_id, specialist_id, NUTRITIONIST, MessageKind.MEAL_PLAN, "Plan", "   "
            )

    async def test_given_plan_title_over_limit_when_send_then_raises_validation(
        self, chat_service, conversation_repo
    ):
        # Arrange — title cap is 100 chars
        conv_id, _, specialist_id = _seed_conversation(conversation_repo)

        # Act + Assert
        with pytest.raises(ValidationException):
            await chat_service.send_plan(
                conv_id, specialist_id, NUTRITIONIST, MessageKind.MEAL_PLAN, "a" * 101, "ok"
            )

    async def test_given_plan_content_over_limit_when_send_then_raises_validation(
        self, chat_service, conversation_repo
    ):
        # Arrange — content cap is 8000 chars
        conv_id, _, specialist_id = _seed_conversation(conversation_repo)

        # Act + Assert
        with pytest.raises(ValidationException):
            await chat_service.send_plan(
                conv_id, specialist_id, NUTRITIONIST, MessageKind.MEAL_PLAN, "Plan", "a" * 8001
            )


class TestMarkRead:
    async def test_given_unread_messages_when_mark_read_then_only_others_messages_marked(
        self, chat_service, conversation_repo, message_repo
    ):
        # Arrange — one message from each party, both unread
        conv_id, patient_id, specialist_id = _seed_conversation(conversation_repo)
        await chat_service.send_text(conv_id, patient_id, "from patient")
        await chat_service.send_text(conv_id, specialist_id, "from specialist")

        # Act — the specialist reads the conversation
        marked = await chat_service.mark_read(conv_id, caller_user_id=specialist_id)

        # Assert — only the patient's message is marked (the reader's own is skipped)
        assert marked == 1
        by_text = {m["message_text"]: m for m in message_repo.rows}
        assert by_text["from patient"]["is_read"] is True
        assert by_text["from specialist"]["is_read"] is False


class TestFetchHistory:
    async def test_given_non_party_when_fetch_history_then_raises_forbidden(
        self, chat_service, conversation_repo
    ):
        # Arrange
        conv_id, _, _ = _seed_conversation(conversation_repo)

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await chat_service.fetch_history(conv_id, caller_user_id=uuid.uuid4())
