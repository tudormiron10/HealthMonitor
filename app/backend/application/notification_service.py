"""Red-flag notification logic — triggered after ML predictions are committed."""

import logging
from uuid import UUID

from application.chat_service import ChatService
from application.conversation_service import ConversationService
from core.constants import RED_FLAG_THRESHOLD
from domain.ports.chat_connection_manager import ChatConnectionManager
from domain.ports.relation_repository import RelationRepository
from infrastructure.persistence.models.enums import RelationStatus, UserRole

logger = logging.getLogger(__name__)


class NotificationService:
    """Stateless service that fans out red-flag alerts to all linked specialists."""

    def __init__(
        self,
        relation_repo: RelationRepository,
        conversation_service: ConversationService,
        chat_service: ChatService,
        chat_manager: ChatConnectionManager,
    ) -> None:
        self._rel_repo = relation_repo
        self._conv_service = conversation_service
        self._chat_service = chat_service
        self._chat_manager = chat_manager

    async def notify_red_flag(
        self,
        patient_user_id: UUID,
        record_id: UUID,
        prediction_id: UUID,
        predictions: dict,
    ) -> None:
        """Persist and broadcast a red-flag alert for each APPROVED specialist of the patient."""
        flagged = [
            condition
            for condition, data in predictions.items()
            if isinstance(data, dict) and (data.get("probability") or 0) >= RED_FLAG_THRESHOLD
        ]
        if not flagged:
            return

        relations = await self._rel_repo.list_for_user(
            user_id=patient_user_id,
            role=UserRole.PATIENT,
            statuses=[RelationStatus.APPROVED],
        )
        if not relations:
            return

        payload = {
            "conditions": flagged,
            "record_id": str(record_id),
            "prediction_id": str(prediction_id),
            "patient_user_id": str(patient_user_id),
        }

        for relation in relations:
            specialist_user_id: UUID = relation["specialist_id"]
            try:
                conv = await self._conv_service.open_or_create(
                    caller_user_id=patient_user_id,
                    caller_role=UserRole.PATIENT.value,
                    counterparty_user_id=specialist_user_id,
                )
                msg = await self._chat_service.send_system_red_flag(
                    conversation_id=conv["id"],
                    payload=payload,
                )

                from api.routes.schemas.chat_schemas import MessageRead
                msg_read = MessageRead(
                    id=msg["id"],
                    conversation_id=msg["conversation_id"],
                    sender_id=msg.get("sender_id"),
                    message_kind=msg["message_kind"],
                    message_text=msg["message_text"],
                    payload=msg.get("payload"),
                    sent_at=msg["sent_at"],
                    is_read=msg["is_read"],
                )
                await self._chat_manager.broadcast_to_conversation(
                    conv["id"],
                    {"type": "message", "message": msg_read.model_dump(mode="json")},
                )

                await self._chat_manager.broadcast_to_user(
                    specialist_user_id,
                    {
                        "type": "red_flag_toast",
                        "conditions": flagged,
                        "conversation_id": str(conv["id"]),
                        "patient_user_id": str(patient_user_id),
                        "record_id": str(record_id),
                    },
                )
            except Exception:
                logger.exception(
                    "Failed to send red-flag notification to specialist %s", specialist_user_id
                )
