"""WebSocket endpoint for user-level real-time notifications."""

import logging
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt # type: ignore

from core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()


async def _reject(websocket: WebSocket, code: int) -> None:
    """Accept then immediately close with the given code so the client receives it."""
    await websocket.accept()
    await websocket.close(code=code)


@router.websocket("/ws/user")
async def websocket_user(websocket: WebSocket):
    """Persistent user-level notification WebSocket."""
    settings = get_settings()
    token: str | None = websocket.query_params.get("token")

    if not token:
        await _reject(websocket, 4401)
        return

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        await _reject(websocket, 4401)
        return

    await websocket.accept()
    chat_manager = websocket.app.state.chat_manager
    await chat_manager.connect_user(user_id, websocket)
    logger.info("User WS connected: user=%s", user_id)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("User WS error: user=%s", user_id)
    finally:
        await chat_manager.disconnect_user(user_id, websocket)
        logger.info("User WS disconnected: user=%s", user_id)
