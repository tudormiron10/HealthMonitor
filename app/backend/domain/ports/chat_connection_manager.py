"""Abstract port for the WebSocket connection manager."""

from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID


class ChatConnectionManager(ABC):
    """Port for managing active WebSocket connections across chat conversations."""

    @abstractmethod
    async def connect(self, conversation_id: UUID, user_id: UUID, websocket: Any) -> None:
        """Register a new WebSocket for the given conversation and user."""

    @abstractmethod
    async def disconnect(self, conversation_id: UUID, user_id: UUID, websocket: Any) -> None:
        """Remove a WebSocket from all tracking structures."""

    @abstractmethod
    async def broadcast_to_conversation(self, conversation_id: UUID, payload: dict) -> None:
        """Send payload to every socket connected to this conversation room."""

    @abstractmethod
    async def broadcast_to_user(self, user_id: UUID, payload: dict) -> None:
        """Send payload to every socket open by this user, across all conversations."""

    @abstractmethod
    async def close_conversation(self, conversation_id: UUID, code: int = 4403) -> None:
        """Close every active WebSocket in a conversation room with the given close code."""

    @abstractmethod
    def is_user_connected_anywhere(self, user_id: UUID) -> bool:
        """Return True if the user has at least one live WebSocket connection."""

    @abstractmethod
    async def connect_user(self, user_id: UUID, websocket: Any) -> None:
        """Register a persistent user-level WebSocket not tied to any conversation."""

    @abstractmethod
    async def disconnect_user(self, user_id: UUID, websocket: Any) -> None:
        """Remove a user-level WebSocket; cleans up the key when the set becomes empty."""
