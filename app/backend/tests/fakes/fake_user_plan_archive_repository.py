"""In-memory fake for the user plan-archive repository.

Standalone (PlanService takes it as an untyped dependency). Archive state is a
set of (user_id, message_id) pairs — per-user, matching the real composite-PK table.
"""

from uuid import UUID


class FakeUserPlanArchiveRepository:
    def __init__(self) -> None:
        self.archived: set[tuple[UUID, UUID]] = set()

    async def list_archived_message_ids(self, user_id: UUID) -> set[UUID]:
        return {mid for (uid, mid) in self.archived if uid == user_id}

    async def archive(self, user_id: UUID, message_id: UUID) -> None:
        self.archived.add((user_id, message_id))

    async def unarchive(self, user_id: UUID, message_id: UUID) -> None:
        self.archived.discard((user_id, message_id))
