"""Unit tests for RelationService — the patient-specialist relationship lifecycle."""

import uuid

import pytest

from core.exceptions import ForbiddenException, NotFoundException, ValidationException
from infrastructure.persistence.models.enums import RelationStatus, UserRole
from tests.builders import make_relation, make_user

PATIENT = UserRole.PATIENT.value
DOCTOR = UserRole.DOCTOR.value
ADMIN = UserRole.ADMIN.value


class TestRequest:
    async def test_given_patient_initiator_and_specialist_target_when_request_then_creates_pending(
        self, relation_service, user_repo
    ):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        user_repo.seed(make_user(id=specialist_id, role=UserRole.DOCTOR))

        # Act
        relation = await relation_service.request(patient_id, PATIENT, specialist_id)

        # Assert
        assert relation["status"] == RelationStatus.PENDING
        assert relation["patient_id"] == patient_id
        assert relation["specialist_id"] == specialist_id
        assert relation["initiated_by"] == PATIENT

    async def test_given_specialist_initiator_and_patient_target_when_request_then_resolves_roles(
        self, relation_service, user_repo
    ):
        # Arrange
        specialist_id, patient_id = uuid.uuid4(), uuid.uuid4()
        user_repo.seed(make_user(id=patient_id, role=UserRole.PATIENT))

        # Act
        relation = await relation_service.request(specialist_id, DOCTOR, patient_id)

        # Assert — roles resolved regardless of who initiates
        assert relation["patient_id"] == patient_id
        assert relation["specialist_id"] == specialist_id
        assert relation["status"] == RelationStatus.PENDING
        assert relation["initiated_by"] == DOCTOR

    async def test_given_same_initiator_and_target_when_request_then_raises_validation(
        self, relation_service
    ):
        # Arrange
        user_id = uuid.uuid4()

        # Act + Assert
        with pytest.raises(ValidationException):
            await relation_service.request(user_id, PATIENT, user_id)

    async def test_given_nonexistent_target_when_request_then_raises_notfound(
        self, relation_service
    ):
        # Arrange
        patient_id, missing_target = uuid.uuid4(), uuid.uuid4()

        # Act + Assert
        with pytest.raises(NotFoundException):
            await relation_service.request(patient_id, PATIENT, missing_target)

    async def test_given_patient_targets_non_specialist_when_request_then_raises_validation(
        self, relation_service, user_repo
    ):
        # Arrange
        patient_id, target_id = uuid.uuid4(), uuid.uuid4()
        user_repo.seed(make_user(id=target_id, role=UserRole.PATIENT))

        # Act + Assert
        with pytest.raises(ValidationException):
            await relation_service.request(patient_id, PATIENT, target_id)

    async def test_given_specialist_targets_non_patient_when_request_then_raises_validation(
        self, relation_service, user_repo
    ):
        # Arrange
        specialist_id, target_id = uuid.uuid4(), uuid.uuid4()
        user_repo.seed(make_user(id=target_id, role=UserRole.DOCTOR))

        # Act + Assert
        with pytest.raises(ValidationException):
            await relation_service.request(specialist_id, DOCTOR, target_id)

    async def test_given_existing_pending_relation_when_request_then_raises_validation(
        self, relation_service, relation_repo, user_repo
    ):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        user_repo.seed(make_user(id=specialist_id, role=UserRole.DOCTOR))
        relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.PENDING,
            )
        )

        # Act + Assert
        with pytest.raises(ValidationException):
            await relation_service.request(patient_id, PATIENT, specialist_id)

    async def test_given_admin_initiator_when_request_then_raises_forbidden(
        self, relation_service, user_repo
    ):
        # Arrange
        admin_id, target_id = uuid.uuid4(), uuid.uuid4()
        user_repo.seed(make_user(id=target_id, role=UserRole.PATIENT))

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await relation_service.request(admin_id, ADMIN, target_id)


class TestApprove:
    async def test_given_pending_relation_when_receiver_approves_then_status_becomes_approved(
        self, relation_service, relation_repo
    ):
        # Arrange — patient initiated, so the specialist is the receiver
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation = relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.PENDING,
                initiated_by=PATIENT,
            )
        )

        # Act
        result = await relation_service.approve(relation["id"], acting_user_id=specialist_id)

        # Assert
        assert result["status"] == RelationStatus.APPROVED

    async def test_given_pending_relation_when_initiator_approves_then_raises_forbidden(
        self, relation_service, relation_repo
    ):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation = relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.PENDING,
                initiated_by=PATIENT,
            )
        )

        # Act + Assert — the patient initiated, so the patient cannot approve
        with pytest.raises(ForbiddenException):
            await relation_service.approve(relation["id"], acting_user_id=patient_id)

    async def test_given_already_approved_relation_when_approve_then_raises_validation(
        self, relation_service, relation_repo
    ):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation = relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.APPROVED,
                initiated_by=PATIENT,
            )
        )

        # Act + Assert
        with pytest.raises(ValidationException):
            await relation_service.approve(relation["id"], acting_user_id=specialist_id)

    async def test_given_missing_relation_when_approve_then_raises_notfound(
        self, relation_service
    ):
        # Act + Assert
        with pytest.raises(NotFoundException):
            await relation_service.approve(uuid.uuid4(), acting_user_id=uuid.uuid4())


class TestReject:
    async def test_given_pending_relation_when_receiver_rejects_then_status_becomes_rejected(
        self, relation_service, relation_repo
    ):
        # Arrange
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation = relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.PENDING,
                initiated_by=PATIENT,
            )
        )

        # Act
        result = await relation_service.reject(relation["id"], acting_user_id=specialist_id)

        # Assert
        assert result["status"] == RelationStatus.REJECTED

    async def test_given_already_approved_relation_when_reject_then_raises_validation(
        self, relation_service, relation_repo
    ):
        # Arrange — only PENDING relations can be rejected
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation = relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.APPROVED,
                initiated_by=PATIENT,
            )
        )

        # Act + Assert
        with pytest.raises(ValidationException):
            await relation_service.reject(relation["id"], acting_user_id=specialist_id)

    async def test_given_pending_relation_when_initiator_rejects_then_raises_forbidden(
        self, relation_service, relation_repo
    ):
        # Arrange — patient initiated, so the patient is not the receiver
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation = relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.PENDING,
                initiated_by=PATIENT,
            )
        )

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await relation_service.reject(relation["id"], acting_user_id=patient_id)


class TestRevoke:
    async def test_given_approved_relation_when_a_party_revokes_then_status_becomes_revoked(
        self, relation_service, relation_repo
    ):
        # Arrange — APPROVED can be revoked by either party; the patient is a party
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation = relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.APPROVED,
                initiated_by=PATIENT,
            )
        )

        # Act
        result = await relation_service.revoke(relation["id"], acting_user_id=patient_id)

        # Assert
        assert result["status"] == RelationStatus.REVOKED

    async def test_given_pending_relation_when_non_initiator_revokes_then_raises_forbidden(
        self, relation_service, relation_repo
    ):
        # Arrange — patient initiated; only the initiator may cancel a PENDING relation
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation = relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.PENDING,
                initiated_by=PATIENT,
            )
        )

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await relation_service.revoke(relation["id"], acting_user_id=specialist_id)

    async def test_given_rejected_relation_when_revoke_then_raises_validation(
        self, relation_service, relation_repo
    ):
        # Arrange — only APPROVED or PENDING relations can be revoked
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation = relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.REJECTED,
                initiated_by=PATIENT,
            )
        )

        # Act + Assert
        with pytest.raises(ValidationException):
            await relation_service.revoke(relation["id"], acting_user_id=patient_id)

    async def test_given_approved_relation_when_non_party_revokes_then_raises_forbidden(
        self, relation_service, relation_repo
    ):
        # Arrange — an APPROVED relation may only be revoked by a party
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        relation = relation_repo.seed(
            make_relation(
                patient_id=patient_id,
                specialist_id=specialist_id,
                status=RelationStatus.APPROVED,
                initiated_by=PATIENT,
            )
        )

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await relation_service.revoke(relation["id"], acting_user_id=uuid.uuid4())


class TestListing:
    async def test_given_received_and_initiated_pending_when_list_pending_received_then_returns_only_received(
        self, relation_service, relation_repo
    ):
        # Arrange — specialist S: one request received (patient initiated), one sent (S initiated)
        specialist_id = uuid.uuid4()
        received = relation_repo.seed(
            make_relation(
                patient_id=uuid.uuid4(),
                specialist_id=specialist_id,
                status=RelationStatus.PENDING,
                initiated_by=PATIENT,
            )
        )
        relation_repo.seed(
            make_relation(
                patient_id=uuid.uuid4(),
                specialist_id=specialist_id,
                status=RelationStatus.PENDING,
                initiated_by=DOCTOR,
            )
        )

        # Act
        result = await relation_service.list_pending_received(specialist_id, DOCTOR)

        # Assert
        assert [r["id"] for r in result] == [received["id"]]

    async def test_given_received_and_initiated_pending_when_list_sent_then_returns_only_initiated(
        self, relation_service, relation_repo
    ):
        # Arrange
        specialist_id = uuid.uuid4()
        relation_repo.seed(
            make_relation(
                patient_id=uuid.uuid4(),
                specialist_id=specialist_id,
                status=RelationStatus.PENDING,
                initiated_by=PATIENT,
            )
        )
        sent = relation_repo.seed(
            make_relation(
                patient_id=uuid.uuid4(),
                specialist_id=specialist_id,
                status=RelationStatus.PENDING,
                initiated_by=DOCTOR,
            )
        )

        # Act
        result = await relation_service.list_sent(specialist_id, DOCTOR)

        # Assert
        assert [r["id"] for r in result] == [sent["id"]]
