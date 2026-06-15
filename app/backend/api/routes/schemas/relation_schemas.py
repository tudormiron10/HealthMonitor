"""Pydantic schemas for patient-specialist relations."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from infrastructure.persistence.models.enums import MedicalSpecialization, RelationStatus


class RelationCreate(BaseModel):
    """Payload for initiating a relation request."""

    target_user_id: UUID


class RelationStatusUpdate(BaseModel):
    """Payload for transitioning a relation's status."""

    action: Literal["approve", "reject", "revoke"]


class CounterpartyRead(BaseModel):
    """The other party in a relation, as seen by the caller."""

    user_id: UUID
    first_name: str
    last_name: str
    role: str
    specialization: MedicalSpecialization | None = None
    photo_url: str | None = None
    headline: str | None = None


class RelationRead(BaseModel):
    """Full relation representation returned by list and mutation endpoints."""

    id: UUID
    patient_id: UUID
    specialist_id: UUID
    status: RelationStatus
    initiated_by: str
    counterparty: CounterpartyRead | None = None

    class Config:
        from_attributes = True
