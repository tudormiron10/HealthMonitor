"""Chat conversation endpoints."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from api.dependencies import get_chat_service, get_conversation_service, get_current_user, get_db, require_role
from api.routes.schemas.chat_schemas import ConversationCreate, ConversationRead, MarkReadResponse, MessagePreview, MessageRead, SendPlanRequest, UnreadSummaryResponse
from application.chat_service import ChatService
from application.conversation_service import ConversationService
from infrastructure.persistence.models.enums import MessageKind, UserRole
from infrastructure.persistence.repositories.conversation_repository import SqlAlchemyConversationRepository
from infrastructure.persistence.repositories.message_repository import SqlAlchemyMessageRepository
from infrastructure.persistence.repositories.patient_repository import SqlAlchemyPatientRepository
from infrastructure.persistence.repositories.specialist_repository import SqlAlchemySpecialistRepository
from infrastructure.persistence.repositories.user_repository import SqlAlchemyUserRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversations", tags=["Chat"])

_SPECIALIST_ROLE_VALUES = {"DOCTOR", "NUTRITIONIST", "COACH"}
_PLAN_SENDER_ROLES = [UserRole.NUTRITIONIST, UserRole.COACH]


async def _counterparty_profile(user_id: UUID, db: AsyncSession) -> tuple[str, str, str, str | None]:
    """Return (first_name, last_name, role, photo_url) for any user."""
    user = await SqlAlchemyUserRepository(db).get_by_id(user_id)
    if user is None:
        return ("", "", "UNKNOWN", None)
    role = str(user["role"].value if hasattr(user["role"], "value") else user["role"])
    if role in _SPECIALIST_ROLE_VALUES:
        profile = await SqlAlchemySpecialistRepository(db).get_by_user_id(user_id)
        if profile:
            return (profile["first_name"], profile["last_name"], role, profile.get("photo_url"))
    else:
        profile = await SqlAlchemyPatientRepository(db).get_by_user_id(user_id)
        if profile:
            return (profile["first_name"], profile["last_name"], role, None)
    return ("", "", role, None)


def _to_preview(msg: dict | None) -> MessagePreview | None:
    if msg is None:
        return None
    return MessagePreview(
        id=msg["id"],
        kind=msg["message_kind"],
        text=msg["message_text"],
        sent_at=msg["sent_at"],
        sender_id=msg.get("sender_id"),
    )


async def _build_read(
    conv: dict,
    caller_id: UUID,
    db: AsyncSession,
    last_message: dict | None = None,
    unread_count: int = 0,
) -> ConversationRead:
    counterparty_id = conv.get("counterparty_user_id") or (
        conv["specialist_user_id"]
        if str(conv["patient_user_id"]) == str(caller_id)
        else conv["patient_user_id"]
    )
    first, last, role, photo = await _counterparty_profile(counterparty_id, db)
    return ConversationRead(
        id=conv["id"],
        counterparty_user_id=counterparty_id,
        counterparty_first_name=first,
        counterparty_last_name=last,
        counterparty_role=role,
        counterparty_photo_url=photo,
        unread_count=unread_count,
        last_message=_to_preview(last_message or conv.get("last_message")),
        updated_at=conv["updated_at"],
    )


@router.post("/", response_model=ConversationRead, status_code=201)
async def open_or_create_conversation(
    body: ConversationCreate,
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
    db: AsyncSession = Depends(get_db),
):
    """Open or retrieve the conversation with a counterparty. Requires an APPROVED relation."""
    caller_id = UUID(current_user["id"])
    conv = await service.open_or_create(
        caller_user_id=caller_id,
        caller_role=current_user["role"],
        counterparty_user_id=body.counterparty_user_id,
    )
    await db.commit()

    msg_repo = SqlAlchemyMessageRepository(db)
    last_msg = await msg_repo.get_last_message(conv["id"])
    unread_map = await msg_repo.count_unread_for_user(caller_id)

    return await _build_read(
        conv, caller_id, db,
        last_message=last_msg,
        unread_count=unread_map.get(conv["id"], 0),
    )


@router.get("/unread-summary", response_model=UnreadSummaryResponse)
async def get_unread_summary(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return total and per-conversation unread counts for the caller — used by the sidebar badge."""
    caller_id = UUID(current_user["id"])
    unread_map = await SqlAlchemyMessageRepository(db).count_unread_for_user(caller_id)
    by_conversation = {str(k): v for k, v in unread_map.items()}
    return UnreadSummaryResponse(total=sum(by_conversation.values()), by_conversation=by_conversation)


@router.get("/{conversation_id}/messages", response_model=list[MessageRead])
async def get_messages(
    conversation_id: UUID,
    since_message_id: UUID | None = Query(default=None),
    limit: int = Query(default=200, le=500),
    current_user: dict = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """Return message history for a conversation. Only accessible by conversation parties."""
    messages = await chat_service.fetch_history(
        conversation_id=conversation_id,
        caller_user_id=UUID(current_user["id"]),
        since_message_id=since_message_id,
    )
    return [
        MessageRead(
            id=m["id"],
            conversation_id=m["conversation_id"],
            sender_id=m.get("sender_id"),
            message_kind=m["message_kind"],
            message_text=m["message_text"],
            payload=m.get("payload"),
            sent_at=m["sent_at"],
            is_read=m["is_read"],
        )
        for m in messages
    ]


@router.patch("/{conversation_id}/read", response_model=MarkReadResponse)
async def mark_conversation_read(
    conversation_id: UUID,
    current_user: dict = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service),
):
    """Mark all unread messages in the conversation as read for the caller."""
    updated = await chat_service.mark_read(
        conversation_id=conversation_id,
        caller_user_id=UUID(current_user["id"]),
    )
    return MarkReadResponse(updated=updated)


@router.get("/", response_model=list[ConversationRead])
async def list_conversations(
    current_user: dict = Depends(get_current_user),
    service: ConversationService = Depends(get_conversation_service),
    db: AsyncSession = Depends(get_db),
):
    """Return all conversations for the caller, ordered by most-recently-active first."""
    caller_id = UUID(current_user["id"])
    conversations = await service.list_for_user(caller_id)
    return [
        await _build_read(conv, caller_id, db, unread_count=conv.get("unread_count", 0))
        for conv in conversations
    ]


@router.post("/{conversation_id}/plan", response_model=MessageRead, status_code=201)
async def send_plan_message(
    conversation_id: UUID,
    body: SendPlanRequest,
    request: Request,
    current_user: dict = Depends(require_role(_PLAN_SENDER_ROLES)),
    chat_service: ChatService = Depends(get_chat_service),
    db: AsyncSession = Depends(get_db),
):
    """Send a MEAL_PLAN or WORKOUT_PLAN message to the conversation."""
    saved = await chat_service.send_plan(
        conversation_id=conversation_id,
        sender_user_id=UUID(current_user["id"]),
        sender_role=current_user["role"],
        plan_type=MessageKind(body.plan_type),
        title=body.title,
        content=body.content,
    )
    await db.commit()

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

    try:
        await request.app.state.chat_manager.broadcast_to_conversation(
            conversation_id,
            {"type": "message", "message": msg_read.model_dump(mode="json")},
        )
    except Exception:
        logger.warning("Broadcast failed for plan message %s", saved["id"], exc_info=True)

    try:
        conv_repo = SqlAlchemyConversationRepository(db)
        conv = await conv_repo.get_by_id(conversation_id)
        if conv:
            patient_user_id = conv["patient_user_id"]
            sp_first, sp_last, _, _ = await _counterparty_profile(UUID(current_user["id"]), db)
            sender_name = f"{sp_first} {sp_last}".strip() or current_user.get("email", "")
            await request.app.state.chat_manager.broadcast_to_user(
                patient_user_id,
                {
                    "type": "plan_received",
                    "plan_type": body.plan_type,
                    "sender_name": sender_name,
                    "message_id": str(saved["id"]),
                    "conversation_id": str(conversation_id),
                },
            )
    except Exception:
        logger.warning("plan_received notification failed for message %s", saved["id"], exc_info=True)

    return msg_read
