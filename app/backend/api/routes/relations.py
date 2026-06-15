"""Patient-specialist relation endpoints."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession # type: ignore

from api.dependencies import get_current_user, get_db
from api.routes.schemas.relation_schemas import (
    CounterpartyRead,
    RelationCreate,
    RelationRead,
    RelationStatusUpdate,
)
from application.relation_service import RelationService
from application.specialist_service import SpecialistService
from infrastructure.persistence.models.enums import MedicalSpecialization, UserRole
from infrastructure.persistence.repositories.abe_key_repository import SqlAlchemyABEKeyRepository
from infrastructure.persistence.repositories.patient_repository import SqlAlchemyPatientRepository
from infrastructure.persistence.repositories.conversation_repository import SqlAlchemyConversationRepository
from infrastructure.persistence.repositories.relation_repository import SqlAlchemyRelationRepository
from infrastructure.persistence.repositories.specialist_repository import SqlAlchemySpecialistRepository
from infrastructure.persistence.repositories.user_repository import SqlAlchemyUserRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/relations", tags=["Relations"])


def get_relation_service(db: AsyncSession = Depends(get_db)) -> RelationService:
    return RelationService(
        relation_repo=SqlAlchemyRelationRepository(db),
        user_repo=SqlAlchemyUserRepository(db),
    )


async def _build_counterparty(
    relation: dict,
    current_user_id: str,
    db: AsyncSession,
) -> CounterpartyRead | None:
    """Look up the counterparty's profile for display in a RelationRead response."""
    if str(relation["patient_id"]) == current_user_id:
        counterparty_id = relation["specialist_id"]
        user = await SqlAlchemyUserRepository(db).get_by_id(counterparty_id)
        if user is None:
            return None
        profile = await SqlAlchemySpecialistRepository(db).get_by_user_id(counterparty_id)
        if profile is None:
            return None
        return CounterpartyRead(
            user_id=counterparty_id,
            first_name=profile["first_name"],
            last_name=profile["last_name"],
            role=user["role"],
            specialization=profile.get("specialization"),
            photo_url=profile.get("photo_url"),
            headline=SpecialistService.compute_headline(profile, None),
        )
    else:
        counterparty_id = relation["patient_id"]
        profile = await SqlAlchemyPatientRepository(db).get_by_user_id(counterparty_id)
        if profile is None:
            return None
        return CounterpartyRead(
            user_id=counterparty_id,
            first_name=profile["first_name"],
            last_name=profile["last_name"],
            role=UserRole.PATIENT,
            specialization=None,
        )


async def _enrich(relation: dict, current_user_id: str, db: AsyncSession) -> RelationRead:
    counterparty = await _build_counterparty(relation, current_user_id, db)
    return RelationRead(
        id=relation["id"],
        patient_id=relation["patient_id"],
        specialist_id=relation["specialist_id"],
        status=relation["status"],
        initiated_by=relation["initiated_by"],
        counterparty=counterparty,
    )


@router.post("/request", response_model=RelationRead, status_code=201)
async def request_relation(
    request: Request,
    body: RelationCreate,
    current_user: dict = Depends(get_current_user),
    service: RelationService = Depends(get_relation_service),
    db: AsyncSession = Depends(get_db),
):
    """Initiate a relation request. Either a patient or specialist may send the request."""
    relation = await service.request(
        initiator_user_id=UUID(current_user["id"]),
        initiator_role=current_user["role"],
        target_user_id=body.target_user_id,
    )
    await db.commit()

    try:
        await request.app.state.chat_manager.broadcast_to_user(
            body.target_user_id,
            {
                "type": "relation_status_changed",
                "status": "PENDING",
                "counterparty_user_id": current_user["id"],
            },
        )
    except Exception:
        pass

    return await _enrich(relation, current_user["id"], db)


@router.get("/pending", response_model=list[RelationRead])
async def list_pending_received(
    current_user: dict = Depends(get_current_user),
    service: RelationService = Depends(get_relation_service),
    db: AsyncSession = Depends(get_db),
):
    """List PENDING relations where the caller is the receiver."""
    relations = await service.list_pending_received(
        user_id=UUID(current_user["id"]),
        role=current_user["role"],
    )
    return [await _enrich(r, current_user["id"], db) for r in relations]


@router.get("/sent", response_model=list[RelationRead])
async def list_sent(
    current_user: dict = Depends(get_current_user),
    service: RelationService = Depends(get_relation_service),
    db: AsyncSession = Depends(get_db),
):
    """List PENDING relations initiated by the caller."""
    relations = await service.list_sent(
        user_id=UUID(current_user["id"]),
        role=current_user["role"],
    )
    return [await _enrich(r, current_user["id"], db) for r in relations]


@router.get("/approved", response_model=list[RelationRead])
async def list_approved(
    current_user: dict = Depends(get_current_user),
    service: RelationService = Depends(get_relation_service),
    db: AsyncSession = Depends(get_db),
):
    """List APPROVED relations for the caller."""
    relations = await service.list_approved(
        user_id=UUID(current_user["id"]),
        role=current_user["role"],
    )
    return [await _enrich(r, current_user["id"], db) for r in relations]


@router.patch("/{relation_id}", response_model=RelationRead)
async def update_relation_status(
    request: Request,
    relation_id: UUID,
    body: RelationStatusUpdate,
    current_user: dict = Depends(get_current_user),
    service: RelationService = Depends(get_relation_service),
    db: AsyncSession = Depends(get_db),
):
    """Approve, reject, or revoke a relation. Business rules enforced by RelationService."""
    acting_user_id = UUID(current_user["id"])

    if body.action == "approve":
        relation = await service.approve(relation_id, acting_user_id)
    elif body.action == "reject":
        relation = await service.reject(relation_id, acting_user_id)
    else:
        relation = await service.revoke(relation_id, acting_user_id)

    await db.commit()

    chat_manager = request.app.state.chat_manager

    if body.action == "approve":
        try:
            abe = request.app.state.abe_authority
            if abe is not None:
                specialist_user_id = relation["specialist_id"]
                patient_user_id = relation["patient_id"]
                sp_profile = await SqlAlchemySpecialistRepository(db).get_by_user_id(
                    specialist_user_id
                )
                attributes = [f"patient:{patient_user_id}"]
                if sp_profile:
                    spec_value = sp_profile.get("specialization")
                    try:
                        spec_enum = MedicalSpecialization(spec_value)
                        if spec_enum is not MedicalSpecialization.ALTA:
                            attributes.insert(0, f"spec:{spec_enum.name}")
                    except (ValueError, TypeError):
                        pass

                key_repo = SqlAlchemyABEKeyRepository(db)
                await key_repo.revoke_active_key(specialist_user_id, patient_user_id)
                
                key_blob = abe.generate_user_key(abe.master_secret_key, attributes)
                await key_repo.create_key(
                    specialist_user_id, patient_user_id, key_blob, marker_attributes=[]
                )
                await db.commit()
        except Exception:
            logger.warning(
                "ABE key issuance failed for specialist %s / patient %s",
                relation["specialist_id"],
                relation["patient_id"],
                exc_info=True,
            )

    if body.action in ("approve", "reject"):
        new_status = "ACTIVE" if body.action == "approve" else "REJECTED"
        initiated_by_role = relation["initiated_by"]
        initiator_user_id = (
            relation["patient_id"]
            if initiated_by_role in ("PATIENT", "patient")
            else relation["specialist_id"]
        )
        try:
            await chat_manager.broadcast_to_user(
                initiator_user_id,
                {
                    "type": "relation_status_changed",
                    "status": new_status,
                    "counterparty_user_id": str(acting_user_id),
                },
            )
        except Exception:
            pass

    if body.action == "revoke":
        try:
            key_repo = SqlAlchemyABEKeyRepository(db)
            await key_repo.revoke_active_key(
                relation["specialist_id"], relation["patient_id"]
            )
            await db.commit()
        except Exception:
            logger.warning(
                "ABE key revocation failed for specialist %s / patient %s",
                relation["specialist_id"],
                relation["patient_id"],
                exc_info=True,
            )

        revoke_payload = {
            "type": "relation_status_changed",
            "status": "REVOKED",
            "counterparty_user_id": str(acting_user_id),
        }
        for party_id in (relation["patient_id"], relation["specialist_id"]):
            if party_id != acting_user_id:
                try:
                    await chat_manager.broadcast_to_user(party_id, revoke_payload)
                except Exception:
                    pass

        conv_repo = SqlAlchemyConversationRepository(db)
        conv = await conv_repo.find_between(
            patient_user_id=relation["patient_id"],
            specialist_user_id=relation["specialist_id"],
        )
        if conv:
            await chat_manager.close_conversation(conv["id"], code=4403)

    return await _enrich(relation, current_user["id"], db)
