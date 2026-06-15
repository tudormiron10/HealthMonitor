"""Pydantic schemas for ABE access requests."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from infrastructure.persistence.models.enums import AccessRequestStatus


class AccessRequestCreate(BaseModel):
    """Payload for requesting access to out-of-domain markers."""

    conversation_id: UUID
    requested_markers: list[str] = Field(min_length=1, max_length=26)
    justification: str = Field(min_length=20, max_length=1000)


class AccessRequestRead(BaseModel):
    """Response payload for a created or fetched access request."""

    id: UUID
    conversation_id: UUID
    specialist_user_id: UUID
    patient_user_id: UUID
    requested_markers: list[str]
    justification: str
    status: AccessRequestStatus
    created_at: datetime


class AccessRequestRespond(BaseModel):
    """Payload for a patient responding to an access request."""

    action: Literal["approve", "decline"]
    approved_markers: list[str] | None = None

    @model_validator(mode="after")
    def require_markers_on_approve(self) -> "AccessRequestRespond":
        if self.action == "approve" and not self.approved_markers:
            raise ValueError("approved_markers is required and must be non-empty when action is 'approve'.")
        return self
