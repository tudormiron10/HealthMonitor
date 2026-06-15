"""Patient-specialist relation business logic."""

from uuid import UUID

from core.exceptions import ForbiddenException, NotFoundException, ValidationException
from domain.ports.relation_repository import RelationRepository
from domain.ports.user_repository import UserRepository
from infrastructure.persistence.models.enums import RelationStatus, UserRole


_SPECIALIST_ROLES = frozenset({UserRole.DOCTOR, UserRole.NUTRITIONIST, UserRole.COACH})


class RelationService:
    """Stateless service enforcing the patient-specialist relationship lifecycle rules."""

    def __init__(
        self,
        relation_repo: RelationRepository,
        user_repo: UserRepository,
    ) -> None:
        self._relation_repo = relation_repo
        self._user_repo = user_repo

    async def request(
        self,
        initiator_user_id: UUID,
        initiator_role: str,
        target_user_id: UUID,
    ) -> dict:
        """Create a PENDING relation between a patient and a specialist."""
        if str(initiator_user_id) == str(target_user_id):
            raise ValidationException("Cannot request a relation with yourself.")

        target = await self._user_repo.get_by_id(target_user_id)
        if target is None:
            raise NotFoundException("User", str(target_user_id))

        target_role = target["role"]

        if initiator_role == UserRole.PATIENT or initiator_role == UserRole.PATIENT.value:
            if target_role not in _SPECIALIST_ROLES and target_role not in {r.value for r in _SPECIALIST_ROLES}:
                raise ValidationException("Target user must be a specialist.")
            patient_user_id = initiator_user_id
            specialist_user_id = target_user_id
        elif initiator_role in _SPECIALIST_ROLES or initiator_role in {r.value for r in _SPECIALIST_ROLES}:
            if target_role != UserRole.PATIENT and target_role != UserRole.PATIENT.value:
                raise ValidationException("Target user must be a patient.")
            specialist_user_id = initiator_user_id
            patient_user_id = target_user_id
        else:
            raise ForbiddenException("Your role cannot initiate a specialist relation.")

        duplicate = await self._relation_repo.find_existing_between(
            patient_user_id=patient_user_id,
            specialist_user_id=specialist_user_id,
            statuses=[RelationStatus.PENDING, RelationStatus.APPROVED],
        )
        if duplicate is not None:
            raise ValidationException("An active or pending relation already exists.")

        return await self._relation_repo.create(
            patient_user_id=patient_user_id,
            specialist_user_id=specialist_user_id,
            initiated_by=str(initiator_role),
        )

    async def approve(self, relation_id: UUID, acting_user_id: UUID) -> dict:
        """Transition a PENDING relation to APPROVED. Only the receiver may approve."""
        relation = await self._get_or_raise(relation_id)

        if relation["status"] != RelationStatus.PENDING:
            raise ValidationException("Only PENDING relations can be approved.")
        if not self._is_receiver(relation, acting_user_id):
            raise ForbiddenException("Only the request receiver can approve.")

        return await self._relation_repo.update_status(relation_id, RelationStatus.APPROVED)

    async def reject(self, relation_id: UUID, acting_user_id: UUID) -> dict:
        """Transition a PENDING relation to REJECTED. Only the receiver may reject."""
        relation = await self._get_or_raise(relation_id)

        if relation["status"] != RelationStatus.PENDING:
            raise ValidationException("Only PENDING relations can be rejected.")
        if not self._is_receiver(relation, acting_user_id):
            raise ForbiddenException("Only the request receiver can reject.")

        return await self._relation_repo.update_status(relation_id, RelationStatus.REJECTED)

    async def revoke(self, relation_id: UUID, acting_user_id: UUID) -> dict:
        """Transition a relation to REVOKED.

        APPROVED: either party may revoke.
        PENDING: only the initiator may cancel (revoke).
        """
        relation = await self._get_or_raise(relation_id)
        status = relation["status"]

        if status == RelationStatus.APPROVED:
            if not self._is_party(relation, acting_user_id):
                raise ForbiddenException("Only a party to this relation can revoke it.")
        elif status == RelationStatus.PENDING:
            if not self._is_initiator(relation, acting_user_id):
                raise ForbiddenException("Only the request initiator can cancel a pending relation.")
        else:
            raise ValidationException("Only APPROVED or PENDING relations can be revoked.")

        return await self._relation_repo.update_status(relation_id, RelationStatus.REVOKED)

    async def list_pending_received(self, user_id: UUID, role: str) -> list[dict]:
        """Return PENDING relations where the caller is the receiver (not the initiator)."""
        relations = await self._relation_repo.list_for_user(
            user_id=user_id,
            role=role,
            statuses=[RelationStatus.PENDING],
        )
        return [r for r in relations if not self._is_initiator(r, user_id)]

    async def list_sent(self, user_id: UUID, role: str) -> list[dict]:
        """Return PENDING relations initiated by the caller."""
        relations = await self._relation_repo.list_for_user(
            user_id=user_id,
            role=role,
            statuses=[RelationStatus.PENDING],
        )
        return [r for r in relations if self._is_initiator(r, user_id)]

    async def list_approved(self, user_id: UUID, role: str) -> list[dict]:
        """Return all APPROVED relations for the caller."""
        return await self._relation_repo.list_for_user(
            user_id=user_id,
            role=role,
            statuses=[RelationStatus.APPROVED],
        )

    async def _get_or_raise(self, relation_id: UUID) -> dict:
        """Return the relation with the given ID or raise if not found."""
        relation = await self._relation_repo.get_by_id(relation_id)
        if relation is None:
            raise NotFoundException("Relation", str(relation_id))
        return relation

    def _is_initiator(self, relation: dict, acting_user_id: UUID) -> bool:
        """Return True if the acting user is the initiator of the relation."""
        initiated_by = relation["initiated_by"]
        patient_initiated = (
            initiated_by == UserRole.PATIENT or initiated_by == UserRole.PATIENT.value
        )
        if patient_initiated:
            return str(relation["patient_id"]) == str(acting_user_id)
        return str(relation["specialist_id"]) == str(acting_user_id)

    def _is_receiver(self, relation: dict, acting_user_id: UUID) -> bool:
        """Return True if the acting user is the receiver (non-initiator party) of the relation."""
        return (
            self._is_party(relation, acting_user_id)
            and not self._is_initiator(relation, acting_user_id)
        )

    def _is_party(self, relation: dict, acting_user_id: UUID) -> bool:
        """Return True if the acting user is either the patient or specialist in the relation."""
        uid = str(acting_user_id)
        return (
            str(relation["patient_id"]) == uid
            or str(relation["specialist_id"]) == uid
        )
