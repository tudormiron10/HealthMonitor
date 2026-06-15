"""Pydantic schemas for chat conversation and message endpoints."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from infrastructure.persistence.models.enums import MessageKind


class ConversationCreate(BaseModel):
    """Payload for opening or retrieving a conversation with a counterparty."""

    counterparty_user_id: UUID


class MessagePreview(BaseModel):
    """Compact message summary embedded in conversation list responses."""

    id: UUID
    kind: MessageKind
    text: str
    sent_at: datetime
    sender_id: UUID | None = None


class ConversationRead(BaseModel):
    """Full conversation representation with counterparty profile data."""

    id: UUID
    counterparty_user_id: UUID
    counterparty_first_name: str
    counterparty_last_name: str
    counterparty_role: str
    counterparty_photo_url: str | None = None
    unread_count: int = 0
    last_message: MessagePreview | None = None
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageRead(BaseModel):
    """Full message representation returned by history and send endpoints."""

    id: UUID
    conversation_id: UUID
    sender_id: UUID | None = None
    message_kind: MessageKind
    message_text: str
    payload: dict[str, Any] | None = None
    sent_at: datetime
    is_read: bool

    class Config:
        from_attributes = True


class SendMessageBody(BaseModel):
    """Payload for the REST send-message endpoint (used outside WebSocket)."""

    text: str


class SendPlanRequest(BaseModel):
    """Payload for the POST /conversations/{id}/plan endpoint."""

    plan_type: Literal["MEAL_PLAN", "WORKOUT_PLAN"]
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=8000)


class MarkReadResponse(BaseModel):
    """Response for the mark-read endpoint."""

    updated: int


class UnreadSummaryResponse(BaseModel):
    """Aggregated unread counts across all conversations — used by the sidebar badge."""

    total: int
    by_conversation: dict[str, int]
