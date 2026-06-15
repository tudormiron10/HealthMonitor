"""Abstract repository for conversation data access."""

from abc import ABC, abstractmethod
from uuid import UUID


class ConversationRepository(ABC):
    """Port defining chat conversation operations."""

    @abstractmethod
    async def get_by_id(self, conversation_id: UUID) -> dict | None:
        """Return a conversation by its primary key, or None if not found."""

    @abstractmethod
    async def find_between(
        self,
        patient_user_id: UUID,
        specialist_user_id: UUID,
    ) -> dict | None:
        """Return the conversation for a specific patient-specialist pair, or None."""

    @abstractmethod
    async def upsert(
        self,
        patient_user_id: UUID,
        specialist_user_id: UUID,
    ) -> dict:
        """Create the conversation for this pair, or return the existing one."""

    @abstractmethod
    async def list_for_user(self, user_id: UUID) -> list[dict]:
        """Return all conversations where user_id is either party, most-recent first."""
