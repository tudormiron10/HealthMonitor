"""Conversation business logic — open rooms, list conversations, guard access."""

from uuid import UUID

from core.exceptions import ForbiddenException, NotFoundException
from domain.ports.conversation_repository import ConversationRepository
from domain.ports.message_repository import MessageRepository
from domain.ports.relation_repository import RelationRepository
from domain.ports.user_repository import UserRepository
from infrastructure.persistence.models.enums import RelationStatus, UserRole


_SPECIALIST_ROLES = frozenset({UserRole.DOCTOR, UserRole.NUTRITIONIST, UserRole.COACH})


class ConversationService:
    """Stateless service for chat conversation lifecycle."""

    def __init__(
        self,
        conversation_repo: ConversationRepository,
        relation_repo: RelationRepository,
        user_repo: UserRepository,
        message_repo: MessageRepository,
    ) -> None:
        self._conv_repo = conversation_repo
        self._rel_repo = relation_repo
        self._user_repo = user_repo
        self._msg_repo = message_repo

    async def open_or_create(
        self,
        caller_user_id: UUID,
        caller_role: str,
        counterparty_user_id: UUID,
    ) -> dict:
        """Return the conversation for this pair, creating it if it doesn't exist yet.

        Raises ForbiddenException if no APPROVED relation exists between the two users.
        """
        patient_user_id, specialist_user_id = self._resolve_parties(
            caller_user_id, caller_role, counterparty_user_id,
        )
        relation = await self._rel_repo.find_existing_between(
            patient_user_id=patient_user_id,
            specialist_user_id=specialist_user_id,
            statuses=[RelationStatus.APPROVED],
        )
        if relation is None:
            raise ForbiddenException("An approved relation is required to open a conversation.")
        return await self._conv_repo.upsert(
            patient_user_id=patient_user_id,
            specialist_user_id=specialist_user_id,
        )

    async def list_for_user(self, user_id: UUID) -> list[dict]:
        """Return conversations for the user, each enriched with last_message and unread_count."""
        conversations = await self._conv_repo.list_for_user(user_id)
        unread_map = await self._msg_repo.count_unread_for_user(user_id)

        enriched = []
        for conv in conversations:
            last_message = await self._msg_repo.get_last_message(conv["id"])
            counterparty_id = (
                conv["specialist_user_id"]
                if str(conv["patient_user_id"]) == str(user_id)
                else conv["patient_user_id"]
            )
            enriched.append({
                **conv,
                "counterparty_user_id": counterparty_id,
                "last_message": last_message,
                "unread_count": unread_map.get(conv["id"], 0),
            })
        return enriched

    async def get_or_raise(self, conversation_id: UUID, caller_user_id: UUID) -> dict:
        """Return the conversation if the caller is a party, else raise ForbiddenException."""
        conv = await self._conv_repo.get_by_id(conversation_id)
        if conv is None:
            raise NotFoundException("Conversation", str(conversation_id))
        self.assert_party(conv, caller_user_id)
        return conv

    def assert_party(self, conversation: dict, user_id: UUID) -> None:
        """Raise ForbiddenException if user_id is not a party to the conversation."""
        uid = str(user_id)
        is_party = (
            str(conversation["patient_user_id"]) == uid
            or str(conversation["specialist_user_id"]) == uid
        )
        if not is_party:
            raise ForbiddenException("You are not a party to this conversation.")

    def _resolve_parties(
        self,
        caller_user_id: UUID,
        caller_role: str,
        counterparty_user_id: UUID,
    ) -> tuple[UUID, UUID]:
        """Return (patient_user_id, specialist_user_id) from the two participants."""
        is_specialist = (
            caller_role in _SPECIALIST_ROLES
            or caller_role in {r.value for r in _SPECIALIST_ROLES}
        )
        if is_specialist:
            return counterparty_user_id, caller_user_id
        return caller_user_id, counterparty_user_id
