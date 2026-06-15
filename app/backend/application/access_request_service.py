"""Access request business logic — specialist consent requests for out-of-domain markers."""

import json
from uuid import UUID

from core.constants import MARKER_TO_SPECIALIZATIONS
from core.exceptions import ConflictException, ForbiddenException, NotFoundException, ValidationException
from domain.ports.abe_port import ABEAuthority
from infrastructure.persistence.models.enums import AccessRequestStatus, MessageKind, RelationStatus
from infrastructure.persistence.repositories.abe_key_repository import SqlAlchemyABEKeyRepository
from infrastructure.persistence.repositories.access_request_repository import SqlAlchemyAccessRequestRepository
from infrastructure.persistence.repositories.conversation_repository import SqlAlchemyConversationRepository
from infrastructure.persistence.repositories.message_repository import SqlAlchemyMessageRepository
from infrastructure.persistence.repositories.relation_repository import SqlAlchemyRelationRepository

_VALID_MARKERS: frozenset[str] = frozenset(MARKER_TO_SPECIALIZATIONS)


class AccessRequestService:
    """Stateless service for specialist marker-access consent requests."""

    def __init__(
        self,
        conv_repo: SqlAlchemyConversationRepository,
        relation_repo: SqlAlchemyRelationRepository,
        ar_repo: SqlAlchemyAccessRequestRepository,
        message_repo: SqlAlchemyMessageRepository,
        abe_key_repo: SqlAlchemyABEKeyRepository | None = None,
        abe_authority: ABEAuthority | None = None,
    ) -> None:
        self._conv_repo = conv_repo
        self._rel_repo = relation_repo
        self._ar_repo = ar_repo
        self._msg_repo = message_repo
        self._abe_key_repo = abe_key_repo
        self._abe = abe_authority

    async def get_effective_access(
        self,
        specialist_user_id: UUID,
        patient_user_id: UUID,
    ) -> dict[str, str]:
        """Return the specialist's record-independent marker access for a patient."""
        relation = await self._rel_repo.find_existing_between(
            patient_user_id=patient_user_id,
            specialist_user_id=specialist_user_id,
            statuses=[RelationStatus.APPROVED],
        )
        if relation is None:
            raise ForbiddenException("No approved relation exists with this patient.")

        if self._abe_key_repo is None:
            return {m: "LOCKED" for m in MARKER_TO_SPECIALIZATIONS}
        key_row = await self._abe_key_repo.get_active_key_row(specialist_user_id, patient_user_id)
        if key_row is None:
            return {m: "LOCKED" for m in MARKER_TO_SPECIALIZATIONS}

        key_data = json.loads(key_row["key_blob"].decode("utf-8"))
        spec_attrs: set[str] = set()
        marker_attrs: set[str] = set()
        for attr in key_data.get("attributes", {}):
            if attr.startswith("spec:"):
                spec_attrs.add(attr[len("spec:"):])
            elif attr.startswith("marker:"):
                marker_attrs.add(attr[len("marker:"):])

        access: dict[str, str] = {}
        for marker, specs in MARKER_TO_SPECIALIZATIONS.items():
            if not specs:
                access[marker] = "DECRYPTED"  
                continue
            granted = any(s.name in spec_attrs for s in specs) or marker in marker_attrs
            access[marker] = "DECRYPTED" if granted else "LOCKED"
        return access

    async def create_request(
        self,
        caller_user_id: UUID,
        conversation_id: UUID,
        requested_markers: list[str],
        justification: str,
    ) -> tuple[dict, dict]:
        """Insert an ACCESS_REQUEST row and a matching chat message in one transaction.

        Returns (access_request_dict, message_dict). Caller must commit and broadcast.

        Raises:
            NotFoundException: conversation does not exist.
            ForbiddenException: caller is not the specialist party of the conversation,
                or the underlying relation is not APPROVED.
            ValidationException: an unknown marker key was supplied.
            ConflictException: a PENDING request with overlapping markers already exists.
        """
        conv = await self._conv_repo.get_by_id(conversation_id)
        if conv is None:
            raise NotFoundException("Conversation", str(conversation_id))

        if str(conv["specialist_user_id"]) != str(caller_user_id):
            raise ForbiddenException("Only the specialist party may create access requests.")

        relation = await self._rel_repo.find_existing_between(
            patient_user_id=conv["patient_user_id"],
            specialist_user_id=conv["specialist_user_id"],
            statuses=[RelationStatus.APPROVED],
        )
        if relation is None:
            raise ForbiddenException("No approved relation exists for this conversation.")

        unknown = [m for m in requested_markers if m not in _VALID_MARKERS]
        if unknown:
            raise ValidationException(f"Unknown marker keys: {unknown}")

        effective = await self.get_effective_access(
            conv["specialist_user_id"], conv["patient_user_id"]
        )
        already_granted = sorted(m for m in requested_markers if effective.get(m) == "DECRYPTED")
        requested_markers = [m for m in requested_markers if effective.get(m) != "DECRYPTED"]
        if not requested_markers:
            raise ConflictException(
                f"The specialist already has access to all requested markers: {already_granted}"
            )

        pending = await self._ar_repo.find_pending_for_conversation(conversation_id)
        existing_markers = {m for req in pending for m in req["requested_markers"]}
        overlap = existing_markers & set(requested_markers)
        if overlap:
            raise ConflictException(
                f"A pending request already covers these markers: {sorted(overlap)}"
            )

        ar = await self._ar_repo.create({
            "conversation_id": conversation_id,
            "specialist_user_id": conv["specialist_user_id"],
            "patient_user_id": conv["patient_user_id"],
            "requested_markers": requested_markers,
            "justification": justification,
            "status": AccessRequestStatus.PENDING,
        })

        msg = await self._msg_repo.create(
            conversation_id=conversation_id,
            sender_id=caller_user_id,
            message_kind=MessageKind.ACCESS_REQUEST,
            message_text=justification,
            payload={"request_id": str(ar["id"]), "requested_markers": requested_markers},
        )

        return ar, msg

    async def respond_to_request(
        self,
        caller_user_id: UUID,
        request_id: UUID,
        action: str,
        approved_markers: list[str] | None,
    ) -> tuple[dict, dict]:
        """Approve or decline a PENDING access request.

        APPROVE: re-issues the specialist's ABE key with the newly approved marker:*
        attributes added, then records status + inserts ACCESS_RESPONSE message.
        DECLINE: records status + inserts ACCESS_RESPONSE message; no key changes.

        Returns (access_request_dict, message_dict). Caller must commit and broadcast.

        Raises:
            NotFoundException: request does not exist.
            ForbiddenException: caller is not the patient party.
            ValidationException: approved_markers contain markers outside the requested set.
            ConflictException: request is not in PENDING status.
        """
        ar = await self._ar_repo.get_by_id(request_id)
        if ar is None:
            raise NotFoundException("AccessRequest", str(request_id))

        if str(ar["patient_user_id"]) != str(caller_user_id):
            raise ForbiddenException("Only the patient party may respond to access requests.")

        if ar["status"] != AccessRequestStatus.PENDING:
            raise ConflictException("This access request has already been responded to.")

        if action == "approve":
            invalid = set(approved_markers or []) - set(ar["requested_markers"])
            if invalid:
                raise ValidationException(
                    f"approved_markers contains markers not in the original request: {sorted(invalid)}"
                )

            if self._abe and self._abe_key_repo:
                await self._reissue_key(
                    specialist_user_id=ar["specialist_user_id"],
                    patient_user_id=ar["patient_user_id"],
                    new_markers=approved_markers,
                )

            updated_ar = await self._ar_repo.update_status(
                request_id,
                status=AccessRequestStatus.APPROVED,
                approved_markers=approved_markers,
            )
            payload = {
                "request_id": str(request_id),
                "status": "APPROVED",
                "approved_markers": approved_markers,
            }
        else:
            updated_ar = await self._ar_repo.update_status(
                request_id,
                status=AccessRequestStatus.DECLINED,
                approved_markers=[],
            )
            payload = {
                "request_id": str(request_id),
                "status": "DECLINED",
                "approved_markers": [],
            }

        msg = await self._msg_repo.create(
            conversation_id=ar["conversation_id"],
            sender_id=caller_user_id,
            message_kind=MessageKind.ACCESS_RESPONSE,
            message_text="",
            payload=payload,
        )

        return updated_ar, msg

    async def _reissue_key(
        self,
        specialist_user_id: UUID,
        patient_user_id: UUID,
        new_markers: list[str],
    ) -> None:
        """Extend the specialist's ABE key with additional marker:* attributes."""
        key_row = await self._abe_key_repo.get_active_key_row(specialist_user_id, patient_user_id)
        if key_row is None:
            return

        existing_key_data = json.loads(key_row["key_blob"].decode("utf-8"))
        base_attrs = [
            a for a in existing_key_data["attributes"].keys()
            if not a.startswith("marker:")
        ]

        existing_marker_attrs: list[str] = key_row["marker_attributes"] or []
        new_marker_attrs = list({*existing_marker_attrs, *(f"marker:{m}" for m in new_markers)})
        new_full_attrs = base_attrs + new_marker_attrs

        new_key_blob = self._abe.generate_user_key(self._abe.master_secret_key, new_full_attrs)
        await self._abe_key_repo.update_key(
            specialist_user_id, patient_user_id, new_key_blob, new_marker_attrs
        )
