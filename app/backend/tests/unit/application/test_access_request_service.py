"""Unit tests for AccessRequestService — the marker-consent flow."""

import json
import uuid
from types import SimpleNamespace

import pytest

from application.access_request_service import AccessRequestService
from core.constants import MARKER_TO_SPECIALIZATIONS
from core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from infrastructure.persistence.models.enums import AccessRequestStatus, MessageKind, RelationStatus
from tests.builders import make_conversation, make_relation
from tests.fakes import FakeConversationRepository, FakeMessageRepository, FakeRelationRepository


class _FakeAccessRequestRepo:
    def __init__(self) -> None:
        self.rows: dict = {}

    def seed(self, row: dict) -> dict:
        self.rows[row["id"]] = row
        return row

    async def create(self, data: dict) -> dict:
        row = {"id": uuid.uuid4(), **data}
        self.rows[row["id"]] = row
        return row

    async def get_by_id(self, request_id):
        return self.rows.get(request_id)

    async def find_pending_for_conversation(self, conversation_id):
        return [
            r for r in self.rows.values()
            if r["conversation_id"] == conversation_id and r["status"] == AccessRequestStatus.PENDING
        ]

    async def update_status(self, request_id, status, approved_markers):
        row = self.rows[request_id]
        row["status"] = status
        row["approved_markers"] = approved_markers
        return row


class _FakeAbeKeyRepo:
    def __init__(self, key_row=None) -> None:
        self.key_row = key_row
        self.updated = None

    async def get_active_key_row(self, specialist_user_id, patient_user_id):
        return self.key_row

    async def update_key(self, specialist_user_id, patient_user_id, key_blob, marker_attrs):
        self.updated = (specialist_user_id, patient_user_id, key_blob, marker_attrs)


class _AbeStub:
    master_secret_key = b"master-secret"

    def generate_user_key(self, msk, attrs):
        return json.dumps({"attributes": {a: 1 for a in attrs}}).encode("utf-8")


def _service(conv_repo, rel_repo, ar_repo, msg_repo, abe=None, abe_key_repo=None):
    return AccessRequestService(
        conv_repo=conv_repo,
        relation_repo=rel_repo,
        ar_repo=ar_repo,
        message_repo=msg_repo,
        abe_key_repo=abe_key_repo,
        abe_authority=abe,
    )


@pytest.fixture
def ctx():
    return SimpleNamespace(
        conv_repo=FakeConversationRepository(),
        rel_repo=FakeRelationRepository(),
        ar_repo=_FakeAccessRequestRepo(),
        msg_repo=FakeMessageRepository(),
    )


def _seed_conv_with_relation(ctx, approved=True):
    patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
    conv = ctx.conv_repo.seed(make_conversation(patient_user_id=patient_id, specialist_user_id=specialist_id))
    status = RelationStatus.APPROVED if approved else RelationStatus.PENDING
    ctx.rel_repo.seed(make_relation(patient_id=patient_id, specialist_id=specialist_id, status=status))
    return conv, patient_id, specialist_id


class TestCreateRequest:
    async def test_given_approved_relation_when_create_then_persists_request_and_message(self, ctx):
        # Arrange
        conv, _, specialist_id = _seed_conv_with_relation(ctx)
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo)

        # Act
        ar, msg = await service.create_request(specialist_id, conv["id"], ["creatinine"], "need renal data")

        # Assert
        assert ar["status"] == AccessRequestStatus.PENDING
        assert ar["requested_markers"] == ["creatinine"]
        assert msg["message_kind"] == MessageKind.ACCESS_REQUEST
        assert msg["payload"]["request_id"] == str(ar["id"])

    async def test_given_missing_conversation_when_create_then_raises_notfound(self, ctx):
        # Arrange
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo)

        # Act + Assert
        with pytest.raises(NotFoundException):
            await service.create_request(uuid.uuid4(), uuid.uuid4(), ["creatinine"], "x")

    async def test_given_non_specialist_caller_when_create_then_raises_forbidden(self, ctx):
        # Arrange — the patient party tries to create the request
        conv, patient_id, _ = _seed_conv_with_relation(ctx)
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo)

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await service.create_request(patient_id, conv["id"], ["creatinine"], "x")

    async def test_given_no_approved_relation_when_create_then_raises_forbidden(self, ctx):
        # Arrange — relation is only PENDING
        conv, _, specialist_id = _seed_conv_with_relation(ctx, approved=False)
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo)

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await service.create_request(specialist_id, conv["id"], ["creatinine"], "x")

    async def test_given_unknown_marker_when_create_then_raises_validation(self, ctx):
        # Arrange
        conv, _, specialist_id = _seed_conv_with_relation(ctx)
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo)

        # Act + Assert
        with pytest.raises(ValidationException):
            await service.create_request(specialist_id, conv["id"], ["not_a_marker"], "x")

    async def test_given_overlapping_pending_request_when_create_then_raises_conflict(self, ctx):
        # Arrange — an existing PENDING request already covers "creatinine"
        conv, patient_id, specialist_id = _seed_conv_with_relation(ctx)
        ctx.ar_repo.seed({
            "id": uuid.uuid4(),
            "conversation_id": conv["id"],
            "specialist_user_id": specialist_id,
            "patient_user_id": patient_id,
            "requested_markers": ["creatinine"],
            "status": AccessRequestStatus.PENDING,
        })
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo)

        # Act + Assert
        with pytest.raises(ConflictException):
            await service.create_request(specialist_id, conv["id"], ["creatinine", "urea"], "x")

    async def test_given_already_granted_marker_when_create_then_filtered_out(self, ctx):
        # Arrange — the key already grants creatinine via the NEFROLOGIE spec (Layer 1)
        conv, _, specialist_id = _seed_conv_with_relation(ctx)
        key_repo = _FakeAbeKeyRepo(_key_row(["spec:NEFROLOGIE"]))
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo, abe_key_repo=key_repo)

        # Act — request a granted marker (creatinine) alongside an out-of-domain one (ldl)
        ar, _ = await service.create_request(specialist_id, conv["id"], ["creatinine", "ldl"], "need lipid data")

        # Assert — the already-granted marker is dropped, only the locked one persists
        assert ar["requested_markers"] == ["ldl"]

    async def test_given_all_requested_markers_already_granted_when_create_then_raises_conflict(self, ctx):
        # Arrange — every requested marker is already covered by the key
        conv, _, specialist_id = _seed_conv_with_relation(ctx)
        key_repo = _FakeAbeKeyRepo(_key_row(["spec:NEFROLOGIE"]))
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo, abe_key_repo=key_repo)

        # Act + Assert
        with pytest.raises(ConflictException):
            await service.create_request(specialist_id, conv["id"], ["creatinine", "urea"], "x")


class TestRespondToRequest:
    def _seed_pending_ar(self, ctx, status=AccessRequestStatus.PENDING, requested=("creatinine",)):
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        ar = ctx.ar_repo.seed({
            "id": uuid.uuid4(),
            "conversation_id": uuid.uuid4(),
            "specialist_user_id": specialist_id,
            "patient_user_id": patient_id,
            "requested_markers": list(requested),
            "status": status,
        })
        return ar, patient_id, specialist_id

    async def test_given_pending_request_when_patient_approves_then_status_approved(self, ctx):
        # Arrange
        ar, patient_id, _ = self._seed_pending_ar(ctx)
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo)

        # Act
        updated, msg = await service.respond_to_request(patient_id, ar["id"], "approve", ["creatinine"])

        # Assert
        assert updated["status"] == AccessRequestStatus.APPROVED
        assert updated["approved_markers"] == ["creatinine"]
        assert msg["message_kind"] == MessageKind.ACCESS_RESPONSE
        assert msg["payload"]["status"] == "APPROVED"

    async def test_given_request_when_non_patient_responds_then_raises_forbidden(self, ctx):
        # Arrange
        ar, _, specialist_id = self._seed_pending_ar(ctx)
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo)

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await service.respond_to_request(specialist_id, ar["id"], "approve", ["creatinine"])

    async def test_given_already_responded_request_when_respond_then_raises_conflict(self, ctx):
        # Arrange
        ar, patient_id, _ = self._seed_pending_ar(ctx, status=AccessRequestStatus.APPROVED)
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo)

        # Act + Assert
        with pytest.raises(ConflictException):
            await service.respond_to_request(patient_id, ar["id"], "approve", ["creatinine"])

    async def test_given_approve_with_marker_outside_request_then_raises_validation(self, ctx):
        # Arrange — request was for creatinine, patient tries to approve urea
        ar, patient_id, _ = self._seed_pending_ar(ctx, requested=("creatinine",))
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo)

        # Act + Assert
        with pytest.raises(ValidationException):
            await service.respond_to_request(patient_id, ar["id"], "approve", ["urea"])

    async def test_given_decline_when_patient_responds_then_status_declined(self, ctx):
        # Arrange
        ar, patient_id, _ = self._seed_pending_ar(ctx)
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo)

        # Act
        updated, msg = await service.respond_to_request(patient_id, ar["id"], "decline", None)

        # Assert
        assert updated["status"] == AccessRequestStatus.DECLINED
        assert updated["approved_markers"] == []
        assert msg["payload"]["status"] == "DECLINED"

    async def test_given_approve_with_abe_wired_then_key_is_reissued(self, ctx):
        # Arrange — minimal ABE stubs; existing key with a spec attribute, no markers yet
        ar, patient_id, specialist_id = self._seed_pending_ar(ctx)
        key_row = {
            "key_blob": json.dumps({"attributes": {"spec:NEFROLOGIE": 1, f"patient:{patient_id}": 1}}).encode("utf-8"),
            "marker_attributes": [],
        }
        abe_key_repo = _FakeAbeKeyRepo(key_row=key_row)
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo, abe=_AbeStub(), abe_key_repo=abe_key_repo)

        # Act
        await service.respond_to_request(patient_id, ar["id"], "approve", ["creatinine"])

        # Assert — key re-issued with the new marker attribute
        assert abe_key_repo.updated is not None
        assert "marker:creatinine" in abe_key_repo.updated[3]


def _key_row(attrs):
    return {
        "key_blob": json.dumps({"attributes": {a: 1 for a in attrs}}).encode("utf-8"),
        "marker_attributes": [a[len("marker:"):] for a in attrs if a.startswith("marker:")],
    }


class TestEffectiveAccess:
    def _seed_approved(self, ctx):
        patient_id, specialist_id = uuid.uuid4(), uuid.uuid4()
        ctx.rel_repo.seed(
            make_relation(patient_id=patient_id, specialist_id=specialist_id, status=RelationStatus.APPROVED)
        )
        return patient_id, specialist_id

    async def test_given_cardiologist_key_then_layer1_and_universal_granted_others_locked(self, ctx):
        # Arrange — key carries only the cardiology spec
        patient_id, specialist_id = self._seed_approved(ctx)
        key_repo = _FakeAbeKeyRepo(_key_row(["spec:CARDIOLOGIE", f"patient:{patient_id}"]))
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo, abe_key_repo=key_repo)

        # Act
        access = await service.get_effective_access(specialist_id, patient_id)

        # Assert — Layer 1 (cardio) + universal granted; out-of-domain locked
        assert access["ldl"] == "DECRYPTED"
        assert access["smoker_status"] == "DECRYPTED"
        assert access["sex"] == "DECRYPTED"
        assert access["creatinine"] == "LOCKED"
        assert access["alt"] == "LOCKED"

    async def test_given_consent_marker_then_that_marker_is_granted_regardless_of_spec(self, ctx):
        # Arrange — cardiologist with a consent grant for an out-of-domain marker
        patient_id, specialist_id = self._seed_approved(ctx)
        key_repo = _FakeAbeKeyRepo(
            _key_row(["spec:CARDIOLOGIE", f"patient:{patient_id}", "marker:creatinine"])
        )
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo, abe_key_repo=key_repo)

        # Act
        access = await service.get_effective_access(specialist_id, patient_id)

        # Assert — Layer 2 consent unlocks the marker the spec alone would not
        assert access["creatinine"] == "DECRYPTED"
        assert access["urea"] == "LOCKED"

    async def test_given_no_active_key_then_all_markers_locked(self, ctx):
        # Arrange — approved relation but no key (universal markers also need the key)
        patient_id, specialist_id = self._seed_approved(ctx)
        service = _service(
            ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo, abe_key_repo=_FakeAbeKeyRepo(None)
        )

        # Act
        access = await service.get_effective_access(specialist_id, patient_id)

        # Assert
        assert set(access) == set(MARKER_TO_SPECIALIZATIONS)
        assert all(v == "LOCKED" for v in access.values())

    async def test_given_no_approved_relation_then_raises_forbidden(self, ctx):
        # Arrange — no relation seeded at all
        service = _service(
            ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo, abe_key_repo=_FakeAbeKeyRepo(None)
        )

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await service.get_effective_access(uuid.uuid4(), uuid.uuid4())

    async def test_map_covers_all_markers_independent_of_any_record(self, ctx):
        # Arrange
        patient_id, specialist_id = self._seed_approved(ctx)
        key_repo = _FakeAbeKeyRepo(_key_row(["spec:CARDIOLOGIE", f"patient:{patient_id}"]))
        service = _service(ctx.conv_repo, ctx.rel_repo, ctx.ar_repo, ctx.msg_repo, abe_key_repo=key_repo)

        # Act
        access = await service.get_effective_access(specialist_id, patient_id)

        # Assert — every known marker has a verdict, no record involved
        assert set(access) == set(MARKER_TO_SPECIALIZATIONS)
