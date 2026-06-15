"""Abstract repository for chat message data access."""

from abc import ABC, abstractmethod
from uuid import UUID


class MessageRepository(ABC):
    """Port defining chat message operations."""

    @abstractmethod
    async def create(
        self,
        conversation_id: UUID,
        sender_id: UUID | None,
        message_kind: str,
        message_text: str,
        payload: dict | None = None,
    ) -> dict:
        """Persist a new message and return the saved row."""

    @abstractmethod
    async def list_for_conversation(
        self,
        conversation_id: UUID,
        since_message_id: UUID | None = None,
        limit: int = 200,
    ) -> list[dict]:
        """Return messages ordered by sent_at asc, optionally after a cursor message."""

    @abstractmethod
    async def mark_read_for_user(
        self,
        conversation_id: UUID,
        recipient_user_id: UUID,
    ) -> int:
        """Flip is_read on unread messages not sent by recipient_user_id; return row count."""

    @abstractmethod
    async def count_unread_for_user(self, user_id: UUID) -> dict:
        """Return {conversation_id: unread_count} for all conversations the user is in."""

    @abstractmethod
    async def get_last_message(self, conversation_id: UUID) -> dict | None:
        """Return the most-recent message in a conversation, or None if empty."""
