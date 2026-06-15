"""Unit tests for ConversationService — open/lookup with the APPROVED-relation gate."""

import uuid

import pytest

from core.exceptions import ForbiddenException, NotFoundException
from infrastructure.persistence.models.enums import RelationStatus, UserRole
from tests.builders import make_conversation, make_relation

PATIENT = UserRole.PATIENT.value
DOCTOR = UserRole.DOCTOR.value


class TestOpenOrCreate:
    async def test_given_approved_relation_when_open_or_create_then_upserts_conversation(
        self, conversation_service, relation_repo, conversation_repo
    ):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.APPROVED,
            )
        )

        # Act
        conv = await conversation_service.open_or_create(
            caller_user_id=patient_id, caller_role=PATIENT, counterparty_user_id=specialist_id
        )

        # Assert
        assert conv["patient_user_id"] == patient_id
        assert conv["specialist_user_id"] == specialist_id
        assert len(conversation_repo.rows) == 1

    async def test_given_existing_conversation_when_open_or_create_twice_then_returns_same_id(
        self, conversation_service, relation_repo, conversation_repo
    ):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.APPROVED,
            )
        )

        # Act
        first = await conversation_service.open_or_create(
            caller_user_id=patient_id, caller_role=PATIENT, counterparty_user_id=specialist_id
        )
        second = await conversation_service.open_or_create(
            caller_user_id=patient_id, caller_role=PATIENT, counterparty_user_id=specialist_id
        )

        # Assert — idempotent: same row, no duplicate
        assert first["id"] == second["id"]
        assert len(conversation_repo.rows) == 1

    async def test_given_no_approved_relation_when_open_or_create_then_raises_forbidden(
        self, conversation_service, relation_repo
    ):
        # Arrange — only a PENDING relation exists, so the APPROVED gate must fail
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.PENDING,
            )
        )

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await conversation_service.open_or_create(
                caller_user_id=patient_id, caller_role=PATIENT, counterparty_user_id=specialist_id
            )

    async def test_given_specialist_caller_when_open_or_create_then_parties_resolved_correctly(
        self, conversation_service, relation_repo
    ):
        # Arrange — caller is the specialist; counterparty is the patient
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.APPROVED,
            )
        )

        # Act
        conv = await conversation_service.open_or_create(
            caller_user_id=specialist_id, caller_role=DOCTOR, counterparty_user_id=patient_id
        )

        # Assert — roles assigned by role, not by who called
        assert conv["patient_user_id"] == patient_id
        assert conv["specialist_user_id"] == specialist_id


class TestGetOrRaise:
    async def test_given_caller_is_party_when_get_or_raise_then_returns_conversation(
        self, conversation_service, conversation_repo
    ):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        conv = conversation_repo.seed(
            make_conversation(patient_user_id=patient_id, specialist_user_id=specialist_id)
        )

        # Act
        result = await conversation_service.get_or_raise(conv["id"], patient_id)

        # Assert
        assert result["id"] == conv["id"]

    async def test_given_caller_not_party_when_get_or_raise_then_raises_forbidden(
        self, conversation_service, conversation_repo
    ):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        conv = conversation_repo.seed(
            make_conversation(patient_user_id=patient_id, specialist_user_id=specialist_id)
        )

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await conversation_service.get_or_raise(conv["id"], uuid.uuid4())

    async def test_given_missing_conversation_when_get_or_raise_then_raises_notfound(
        self, conversation_service
    ):
        # Act + Assert
        with pytest.raises(NotFoundException):
            await conversation_service.get_or_raise(uuid.uuid4(), uuid.uuid4())
