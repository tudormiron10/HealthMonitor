"""Chat business logic — send messages, fetch history, mark read."""

from uuid import UUID

from core.exceptions import ForbiddenException, ValidationException
from domain.ports.message_repository import MessageRepository
from infrastructure.persistence.models.enums import MessageKind, UserRole

from application.conversation_service import ConversationService

_MAX_TEXT_LENGTH = 4000
_MAX_PLAN_TITLE_LENGTH = 100
_MAX_PLAN_CONTENT_LENGTH = 8000

_ROLE_TO_PLAN_KIND: dict[str, MessageKind] = {
    UserRole.NUTRITIONIST.value: MessageKind.MEAL_PLAN,
    UserRole.COACH.value: MessageKind.WORKOUT_PLAN,
}


class ChatService:
    """Stateless service for chat message operations."""

    def __init__(
        self,
        message_repo: MessageRepository,
        conversation_service: ConversationService,
    ) -> None:
        self._msg_repo = message_repo
        self._conv_service = conversation_service

    async def send_text(
        self,
        conversation_id: UUID,
        sender_user_id: UUID,
        text: str,
    ) -> dict:
        """Validate, persist, and return a TEXT message."""
        await self._conv_service.get_or_raise(conversation_id, sender_user_id)
        stripped = text.strip()
        if not stripped:
            raise ValidationException("Message text cannot be empty.")
        if len(stripped) > _MAX_TEXT_LENGTH:
            raise ValidationException(f"Message text exceeds {_MAX_TEXT_LENGTH} characters.")
        return await self._msg_repo.create(
            conversation_id=conversation_id,
            sender_id=sender_user_id,
            message_kind=MessageKind.TEXT,
            message_text=stripped,
        )

    async def send_system_red_flag(
        self,
        conversation_id: UUID,
        payload: dict,
    ) -> dict:
        """Persist a SYSTEM_RED_FLAG message with no human sender."""
        return await self._msg_repo.create(
            conversation_id=conversation_id,
            sender_id=None,
            message_kind=MessageKind.SYSTEM_RED_FLAG,
            message_text="Flag roșu",
            payload=payload,
        )

    async def send_plan(
        self,
        conversation_id: UUID,
        sender_user_id: UUID,
        sender_role: str,
        plan_type: MessageKind,
        title: str,
        content: str,
    ) -> dict:
        """Persist a MEAL_PLAN or WORKOUT_PLAN message after strict role↔kind validation."""
        await self._conv_service.get_or_raise(conversation_id, sender_user_id)

        expected_kind = _ROLE_TO_PLAN_KIND.get(sender_role)
        if expected_kind is None or expected_kind != plan_type:
            raise ForbiddenException("Your role is not permitted to send this plan type.")

        title_stripped = title.strip()
        content_stripped = content.strip()
        if not title_stripped or not content_stripped:
            raise ValidationException("Plan title and content cannot be empty.")
        if len(title_stripped) > _MAX_PLAN_TITLE_LENGTH:
            raise ValidationException(f"Plan title exceeds {_MAX_PLAN_TITLE_LENGTH} characters.")
        if len(content_stripped) > _MAX_PLAN_CONTENT_LENGTH:
            raise ValidationException(f"Plan content exceeds {_MAX_PLAN_CONTENT_LENGTH} characters.")

        return await self._msg_repo.create(
            conversation_id=conversation_id,
            sender_id=sender_user_id,
            message_kind=plan_type,
            message_text=title_stripped,
            payload={"title": title_stripped, "content": content_stripped},
        )

    async def fetch_history(
        self,
        conversation_id: UUID,
        caller_user_id: UUID,
        since_message_id: UUID | None = None,
    ) -> list[dict]:
        """Return message history for the conversation, gated on party membership."""
        await self._conv_service.get_or_raise(conversation_id, caller_user_id)
        return await self._msg_repo.list_for_conversation(
            conversation_id=conversation_id,
            since_message_id=since_message_id,
        )

    async def mark_read(
        self,
        conversation_id: UUID,
        caller_user_id: UUID,
    ) -> int:
        """Mark unread messages in the conversation as read for the caller."""
        await self._conv_service.get_or_raise(conversation_id, caller_user_id)
        return await self._msg_repo.mark_read_for_user(
            conversation_id=conversation_id,
            recipient_user_id=caller_user_id,
        )
