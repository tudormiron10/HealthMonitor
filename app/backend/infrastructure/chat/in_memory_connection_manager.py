"""In-memory WebSocket connection manager.

Tracks live sockets in two plain Python dicts. This works correctly for
single-process deployments. Horizontal scaling (multiple Uvicorn workers or
multiple instances behind a load balancer) would require replacing this adapter
with a Redis pub/sub-backed implementation so broadcasts reach sockets on
other processes.
"""

import logging
from uuid import UUID

from fastapi import WebSocket

from domain.ports.chat_connection_manager import ChatConnectionManager

logger = logging.getLogger(__name__)


class InMemoryChatConnectionManager(ChatConnectionManager):
    """Concrete in-memory implementation of ChatConnectionManager."""

    def __init__(self) -> None:
        # conversation_id → set of connected WebSockets in that room
        self._conversation_sockets: dict[UUID, set[WebSocket]] = {}
        # user_id → set of all WebSockets open by that user (across conversations)
        self._user_sockets: dict[UUID, set[WebSocket]] = {}

    async def connect(self, conversation_id: UUID, user_id: UUID, websocket: WebSocket) -> None:
        self._conversation_sockets.setdefault(conversation_id, set()).add(websocket)
        self._user_sockets.setdefault(user_id, set()).add(websocket)

    async def disconnect(self, conversation_id: UUID, user_id: UUID, websocket: WebSocket) -> None:
        self._conversation_sockets.get(conversation_id, set()).discard(websocket)
        self._user_sockets.get(user_id, set()).discard(websocket)

    async def broadcast_to_conversation(self, conversation_id: UUID, payload: dict) -> None:
        sockets = list(self._conversation_sockets.get(conversation_id, set()))
        dead: set[WebSocket] = set()
        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._conversation_sockets[conversation_id].discard(ws)

    async def broadcast_to_user(self, user_id: UUID, payload: dict) -> None:
        sockets = list(self._user_sockets.get(user_id, set()))
        dead: set[WebSocket] = set()
        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._user_sockets[user_id].discard(ws)

    async def close_conversation(self, conversation_id: UUID, code: int = 4403) -> None:
        sockets = list(self._conversation_sockets.get(conversation_id, set()))
        for ws in sockets:
            try:
                await ws.close(code=code)
            except Exception:
                pass

    def is_user_connected_anywhere(self, user_id: UUID) -> bool:
        return bool(self._user_sockets.get(user_id))

    async def connect_user(self, user_id: UUID, websocket: WebSocket) -> None:
        self._user_sockets.setdefault(user_id, set()).add(websocket)

    async def disconnect_user(self, user_id: UUID, websocket: WebSocket) -> None:
        sockets = self._user_sockets.get(user_id)
        if sockets:
            sockets.discard(websocket)
            if not sockets:
                del self._user_sockets[user_id]
