"""Access request endpoints for specialist consent requests."""

import logging
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from api.dependencies import get_abe_authority, get_db, require_role
from api.routes.schemas.access_request_schemas import AccessRequestCreate, AccessRequestRead, AccessRequestRespond
from api.routes.schemas.chat_schemas import MessageRead
from application.access_request_service import AccessRequestService
from infrastructure.persistence.models.enums import UserRole
from infrastructure.persistence.repositories.abe_key_repository import SqlAlchemyABEKeyRepository
from infrastructure.persistence.repositories.access_request_repository import SqlAlchemyAccessRequestRepository
from infrastructure.persistence.repositories.conversation_repository import SqlAlchemyConversationRepository
from infrastructure.persistence.repositories.message_repository import SqlAlchemyMessageRepository
from infrastructure.persistence.repositories.relation_repository import SqlAlchemyRelationRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/access-requests", tags=["Access Requests"])

_SPECIALIST_ROLES = [UserRole.DOCTOR, UserRole.NUTRITIONIST, UserRole.COACH]


def get_access_request_service(
    request: Request,
    db: AsyncSession = Depends(get_db),
    abe_authority=Depends(get_abe_authority),
) -> AccessRequestService:
    return AccessRequestService(
        conv_repo=SqlAlchemyConversationRepository(db),
        relation_repo=SqlAlchemyRelationRepository(db),
        ar_repo=SqlAlchemyAccessRequestRepository(db),
        message_repo=SqlAlchemyMessageRepository(db),
        abe_key_repo=SqlAlchemyABEKeyRepository(db),
        abe_authority=abe_authority,
    )


def _build_msg_frame(msg: dict) -> dict:
    msg_read = MessageRead(
        id=msg["id"],
        conversation_id=msg["conversation_id"],
        sender_id=msg["sender_id"],
        message_kind=msg["message_kind"],
        message_text=msg["message_text"],
        payload=msg["payload"],
        sent_at=msg["sent_at"],
        is_read=msg["is_read"],
    )
    return {"type": "message", "message": msg_read.model_dump(mode="json")}


@router.get(
    "/effective-access/{patient_user_id}",
    response_model=dict[str, Literal["DECRYPTED", "LOCKED"]],
)
async def read_effective_access(
    patient_user_id: UUID,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    service: AccessRequestService = Depends(get_access_request_service),
):
    """Return the calling specialist's record-independent marker access for a patient.
       Returns 403 without an APPROVED relation."""
    return await service.get_effective_access(
        specialist_user_id=UUID(current_user["id"]),
        patient_user_id=patient_user_id,
    )


@router.post("", response_model=AccessRequestRead, status_code=201)
async def create_access_request(
    request: Request,
    body: AccessRequestCreate,
    current_user: dict = Depends(require_role(_SPECIALIST_ROLES)),
    service: AccessRequestService = Depends(get_access_request_service),
    db: AsyncSession = Depends(get_db),
):
    """Request consent from a patient to access out-of-domain markers. 
       Return 409 if a duplicate request exists (same conversation + overlapping markers + PENDING)."""
    ar, msg = await service.create_request(
        caller_user_id=UUID(current_user["id"]),
        conversation_id=body.conversation_id,
        requested_markers=body.requested_markers,
        justification=body.justification,
    )
    await db.commit()

    try:
        await request.app.state.chat_manager.broadcast_to_conversation(
            body.conversation_id,
            _build_msg_frame(msg),
        )
    except Exception:
        logger.warning(
            "Broadcast failed for ACCESS_REQUEST message %s", msg["id"], exc_info=True
        )

    return ar


@router.patch("/{request_id}", response_model=AccessRequestRead)
async def respond_to_access_request(
    request: Request,
    request_id: UUID,
    body: AccessRequestRespond,
    current_user: dict = Depends(require_role(UserRole.PATIENT)),
    service: AccessRequestService = Depends(get_access_request_service),
    db: AsyncSession = Depends(get_db),
):
    """Approve or decline a pending access request.
       Return 409 if the request is no longer PENDING"""
    ar, msg = await service.respond_to_request(
        caller_user_id=UUID(current_user["id"]),
        request_id=request_id,
        action=body.action,
        approved_markers=body.approved_markers,
    )
    await db.commit()

    chat_manager = request.app.state.chat_manager
    conv_id = ar["conversation_id"]

    try:
        await chat_manager.broadcast_to_conversation(conv_id, _build_msg_frame(msg))
    except Exception:
        logger.warning(
            "Broadcast failed for ACCESS_RESPONSE message %s", msg["id"], exc_info=True
        )

    if body.action == "approve":
        try:
            await chat_manager.broadcast_to_user(
                ar["specialist_user_id"],
                {"type": "key_reissued", "patient_user_id": str(ar["patient_user_id"])},
            )
        except Exception:
            logger.warning(
                "key_reissued broadcast failed for specialist %s", ar["specialist_user_id"],
                exc_info=True,
            )

    return ar
