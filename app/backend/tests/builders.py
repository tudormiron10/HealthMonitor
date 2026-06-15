"""Test data factories — keep each test's Arrange block to one or two lines.

Every builder returns a plain dict shaped like the repositories' return rows,
so it drops straight into the fake repos' ``seed`` helpers.
"""

import uuid
from datetime import datetime, timezone

import numpy as np

from infrastructure.persistence.models.enums import (
    MessageKind,
    RelationStatus,
    UserRole,
)


def make_user(role: UserRole = UserRole.PATIENT, **overrides) -> dict:
    row = {
        "id": uuid.uuid4(),
        "email": f"user-{uuid.uuid4().hex[:8]}@test.local",
        "role": role,
        "is_active": True,
        "verification_status": None,
    }
    row.update(overrides)
    return row


def make_relation(
    patient_id=None,
    specialist_id=None,
    status: RelationStatus = RelationStatus.PENDING,
    initiated_by: str = UserRole.PATIENT.value,
    **overrides,
) -> dict:
    row = {
        "id": uuid.uuid4(),
        "patient_id": patient_id or uuid.uuid4(),
        "specialist_id": specialist_id or uuid.uuid4(),
        "status": status,
        "initiated_by": initiated_by,
    }
    row.update(overrides)
    return row


def make_conversation(patient_user_id=None, specialist_user_id=None, **overrides) -> dict:
    row = {
        "id": uuid.uuid4(),
        "patient_user_id": patient_user_id or uuid.uuid4(),
        "specialist_user_id": specialist_user_id or uuid.uuid4(),
        "updated_at": datetime.now(timezone.utc),
    }
    row.update(overrides)
    return row


def make_message(
    conversation_id=None,
    sender_id=None,
    message_kind: MessageKind = MessageKind.TEXT,
    message_text: str = "hello",
    payload: dict | None = None,
    is_read: bool = False,
    **overrides,
) -> dict:
    row = {
        "id": uuid.uuid4(),
        "conversation_id": conversation_id or uuid.uuid4(),
        "sender_id": sender_id,
        "message_kind": message_kind,
        "message_text": message_text,
        "payload": payload,
        "sent_at": datetime.now(timezone.utc),
        "is_read": is_read,
    }
    row.update(overrides)
    return row


class _FakeEstimator:
    """Stub sklearn/xgboost estimator returning fixed predictions."""

    def __init__(self, predicted_class: int, proba: list[float]) -> None:
        self._predicted_class = predicted_class
        self._proba = proba

    def predict(self, X):
        return np.array([self._predicted_class])

    def predict_proba(self, X):
        return np.array([self._proba])


class _FakeTransformer:
    """Stub imputer/scaler. Starts with sample_posterior=True so the prediction
    service has something to flip to False (the determinism invariant)."""

    def __init__(self) -> None:
        self.sample_posterior = True

    def transform(self, X):
        return np.asarray(X, dtype=float)


def make_bundle(
    predicted_class: int = 0,
    proba=(0.9, 0.1),
    predictori: list[str] | None = None,
    clase: dict | None = None,
) -> dict:
    """Build a fake model bundle compatible with PredictionService._predict_single."""
    return {
        "model": _FakeEstimator(predicted_class, list(proba)),
        "imputer": _FakeTransformer(),
        "scaler": _FakeTransformer(),
        "predictori": predictori or ["Sex", "Varsta", "BMI"],
        "varianta": "ModelB",
        "clase": clase or {0: "Sanatos", 1: "Risc Crescut"},
        "target": "Target_Test",
    }
