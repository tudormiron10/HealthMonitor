"""WebSocket endpoint for real-time chat."""

import logging
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt # type: ignore

from api.routes.schemas.chat_schemas import MessageRead
from application.chat_service import ChatService
from application.conversation_service import ConversationService
from core.config import get_settings
from core.exceptions import ForbiddenException, NotFoundException, ValidationException
from infrastructure.persistence.database import async_session_maker
from infrastructure.persistence.models.enums import RelationStatus
from infrastructure.persistence.repositories.conversation_repository import SqlAlchemyConversationRepository
from infrastructure.persistence.repositories.message_repository import SqlAlchemyMessageRepository
from infrastructure.persistence.repositories.relation_repository import SqlAlchemyRelationRepository
from infrastructure.persistence.repositories.user_repository import SqlAlchemyUserRepository

logger = logging.getLogger(__name__)

router = APIRouter()


async def _reject(websocket: WebSocket, code: int) -> None:
    """Accept then immediately close with the given code so the client receives it."""
    await websocket.accept()
    await websocket.close(code=code)


@router.websocket("/ws/chat/{conversation_id}")
async def websocket_chat(
    websocket: WebSocket,
    conversation_id: UUID,
):
    """Real-time chat WebSocket.

    Auth: pass ?token=<jwt> as a query parameter (browser WebSocket API
    cannot send custom headers).
    Close codes: 4401 = missing/invalid token, 4403 = not a party or no APPROVED relation.
    """
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
        role: str = payload["role"]
    except (JWTError, KeyError, ValueError):
        await _reject(websocket, 4401)
        return

    async with async_session_maker() as session:
        conv_service = ConversationService(
            conversation_repo=SqlAlchemyConversationRepository(session),
            relation_repo=SqlAlchemyRelationRepository(session),
            user_repo=SqlAlchemyUserRepository(session),
            message_repo=SqlAlchemyMessageRepository(session),
        )
        rel_repo = SqlAlchemyRelationRepository(session)

        try:
            conv = await conv_service.get_or_raise(conversation_id, user_id)
        except (ForbiddenException, NotFoundException):
            await _reject(websocket, 4403)
            return

        relation = await rel_repo.find_existing_between(
            patient_user_id=conv["patient_user_id"],
            specialist_user_id=conv["specialist_user_id"],
            statuses=[RelationStatus.APPROVED],
        )
        if relation is None:
            await _reject(websocket, 4403)
            return

    await websocket.accept()
    chat_manager = websocket.app.state.chat_manager
    await chat_manager.connect(conversation_id, user_id, websocket)
    logger.info("WS connected: user=%s conversation=%s", user_id, conversation_id)

    try:
        while True:
            data = await websocket.receive_json()

            if not isinstance(data, dict) or data.get("type") != "send":
                await websocket.send_json({"type": "error", "message": "Expected {type: 'send', text: str}"})
                continue

            text = data.get("text", "")

            async with async_session_maker() as session:
                msg_repo = SqlAlchemyMessageRepository(session)
                svc = ChatService(
                    message_repo=msg_repo,
                    conversation_service=ConversationService(
                        conversation_repo=SqlAlchemyConversationRepository(session),
                        relation_repo=SqlAlchemyRelationRepository(session),
                        user_repo=SqlAlchemyUserRepository(session),
                        message_repo=msg_repo,
                    ),
                )
                try:
                    saved = await svc.send_text(conversation_id, user_id, text)
                    await session.commit()
                except (ValidationException, ForbiddenException) as exc:
                    await websocket.send_json({"type": "error", "message": exc.message})
                    continue

            msg_read = MessageRead(
                id=saved["id"],
                conversation_id=saved["conversation_id"],
                sender_id=saved.get("sender_id"),
                message_kind=saved["message_kind"],
                message_text=saved["message_text"],
                payload=saved.get("payload"),
                sent_at=saved["sent_at"],
                is_read=saved["is_read"],
            )
            await chat_manager.broadcast_to_conversation(
                conversation_id,
                {"type": "message", "message": msg_read.model_dump(mode="json")},
            )

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WS error: user=%s conversation=%s", user_id, conversation_id)
    finally:
        await chat_manager.disconnect(conversation_id, user_id, websocket)
        logger.info("WS disconnected: user=%s conversation=%s", user_id, conversation_id)
