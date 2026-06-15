"""Plan business logic — list, archive, and unarchive plan messages."""

from uuid import UUID

from core.exceptions import ForbiddenException, NotFoundException
from infrastructure.persistence.models.enums import MessageKind

_PLAN_KINDS = frozenset({MessageKind.MEAL_PLAN, MessageKind.WORKOUT_PLAN})


class PlanService:
    """Stateless service for plan message operations."""

    def __init__(
        self,
        message_repo,
        conversation_repo,
        user_repo,
        specialist_repo,
        patient_repo,
        archive_repo,
    ) -> None:
        self._message_repo = message_repo
        self._conversation_repo = conversation_repo
        self._user_repo = user_repo
        self._specialist_repo = specialist_repo
        self._patient_repo = patient_repo
        self._archive_repo = archive_repo

    async def list_my(self, patient_user_id: UUID, include_archived: bool) -> list[dict]:
        """Return all plans received by this patient, newest first."""
        rows = await self._message_repo.list_plan_messages_for_patient(patient_user_id)
        archived_ids = await self._archive_repo.list_archived_message_ids(patient_user_id)

        result = []
        for row in rows:
            is_archived = row["id"] in archived_ids
            if not include_archived and is_archived:
                continue
            sender_name = await self._resolve_specialist_name(row.get("sender_id"))
            payload = row.get("payload") or {}
            result.append({
                "message_id": row["id"],
                "conversation_id": row["conversation_id"],
                "plan_type": row["message_kind"],
                "title": row["message_text"],
                "content": payload.get("content", ""),
                "sender_user_id": row["sender_id"],
                "sender_name": sender_name,
                "patient_user_id": row["patient_user_id"],
                "sent_at": row["sent_at"],
                "is_archived": is_archived,
            })
        return result

    async def list_sent(self, specialist_user_id: UUID, include_archived: bool) -> list[dict]:
        """Return all plans sent by this specialist, newest first."""
        rows = await self._message_repo.list_plan_messages_for_specialist(specialist_user_id)
        archived_ids = await self._archive_repo.list_archived_message_ids(specialist_user_id)

        result = []
        for row in rows:
            is_archived = row["id"] in archived_ids
            if not include_archived and is_archived:
                continue
            patient_name = await self._resolve_patient_name(row.get("patient_user_id"))
            payload = row.get("payload") or {}
            result.append({
                "message_id": row["id"],
                "conversation_id": row["conversation_id"],
                "plan_type": row["message_kind"],
                "title": row["message_text"],
                "content": payload.get("content", ""),
                "sender_user_id": row["sender_id"],
                "sender_name": patient_name,
                "patient_user_id": row["patient_user_id"],
                "sent_at": row["sent_at"],
                "is_archived": is_archived,
            })
        return result

    async def archive(self, caller_user_id: UUID, message_id: UUID) -> None:
        """Archive a plan for the calling user. Validates ownership before persisting."""
        await self._validate_plan_access(caller_user_id, message_id)
        await self._archive_repo.archive(caller_user_id, message_id)

    async def unarchive(self, caller_user_id: UUID, message_id: UUID) -> None:
        """Restore an archived plan for the calling user. Validates ownership before persisting."""
        await self._validate_plan_access(caller_user_id, message_id)
        await self._archive_repo.unarchive(caller_user_id, message_id)

    async def _validate_plan_access(self, caller_user_id: UUID, message_id: UUID) -> None:
        """Ensure the message exists, is a plan, and belongs to the caller (as sender or recipient)."""
        row = await self._message_repo.get_plan_message_with_conversation(message_id)
        if row is None:
            raise NotFoundException("Plan message", str(message_id))
        if row["message_kind"] not in _PLAN_KINDS:
            raise ForbiddenException("This message is not a plan.")
        is_patient = str(row["patient_user_id"]) == str(caller_user_id)
        is_sender = row["sender_id"] is not None and str(row["sender_id"]) == str(caller_user_id)
        if not (is_patient or is_sender):
            raise ForbiddenException("You are not authorized to archive this plan.")

    async def _resolve_patient_name(self, user_id: UUID | None) -> str:
        """Helper to get patient name from user ID, falling back to email or empty string."""
        if user_id is None:
            return ""
        profile = await self._patient_repo.get_by_user_id(user_id)
        if profile:
            return f"{profile['first_name']} {profile['last_name']}"
        user = await self._user_repo.get_by_id(user_id)
        return user["email"] if user else ""

    async def _resolve_specialist_name(self, user_id: UUID | None) -> str:
        """Helper to get specialist name from user ID, falling back to email or empty string."""
        if user_id is None:
            return ""
        profile = await self._specialist_repo.get_by_user_id(user_id)
        if profile:
            return f"{profile['first_name']} {profile['last_name']}"
        user = await self._user_repo.get_by_id(user_id)
        return user["email"] if user else ""
