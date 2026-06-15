"""Pydantic schemas for the plans endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from infrastructure.persistence.models.enums import MessageKind


class PlanRead(BaseModel):
    """Full plan representation returned by list and archive endpoints."""

    message_id: UUID
    conversation_id: UUID
    plan_type: MessageKind
    title: str
    content: str
    sender_user_id: UUID
    sender_name: str
    patient_user_id: UUID
    sent_at: datetime
    is_archived: bool

    class Config:
        from_attributes = True


class PlanArchiveResponse(BaseModel):
    """Response for archive and unarchive endpoints."""

    message_id: UUID
    archived: bool
