"""In-memory fake for UserRepository."""

import uuid
from uuid import UUID

from domain.ports.user_repository import UserRepository


def _matches(value, target) -> bool:
    """Compare a stored enum-or-str field against a plain string filter."""
    return value == target or getattr(value, "value", None) == target


class FakeUserRepository(UserRepository):
    """Dict-backed UserRepository keyed by user id."""

    def __init__(self) -> None:
        self.rows: dict[UUID, dict] = {}

    def seed(self, row: dict) -> dict:
        """Insert a pre-built user row (test helper, not part of the port)."""
        self.rows[row["id"]] = row
        return row

    async def get_by_email(self, email: str) -> dict | None:
        return next((r for r in self.rows.values() if r.get("email") == email), None)

    async def get_by_id(self, user_id: UUID) -> dict | None:
        return self.rows.get(user_id)

    async def add(self, user_data: dict) -> dict:
        row = {"id": user_data.get("id", uuid.uuid4()), **user_data}
        self.rows[row["id"]] = row
        return row

    async def list_all(
        self,
        role_filter: str | None,
        search_query: str | None,
        offset: int,
        limit: int,
        verification_status_filter: str | None = None,
    ) -> list[dict]:
        items = list(self.rows.values())
        if role_filter is not None:
            items = [r for r in items if _matches(r.get("role"), role_filter)]
        if verification_status_filter is not None:
            items = [
                r for r in items
                if _matches(r.get("verification_status"), verification_status_filter)
            ]
        if search_query:
            q = search_query.lower()
            items = [r for r in items if q in str(r.get("email", "")).lower()]
        return items[offset:offset + limit]

    async def count_users(
        self,
        role_filter: str | None,
        verification_status_filter: str | None,
    ) -> int:
        items = list(self.rows.values())
        if role_filter is not None:
            items = [r for r in items if _matches(r.get("role"), role_filter)]
        if verification_status_filter is not None:
            items = [
                r for r in items
                if _matches(r.get("verification_status"), verification_status_filter)
            ]
        return len(items)

    async def update_verification_status(self, user_id: UUID, status: str) -> None:
        row = self.rows.get(user_id)
        if row is not None:
            row["verification_status"] = status

    async def set_active(self, user_id: UUID, is_active: bool) -> dict | None:
        row = self.rows.get(user_id)
        if row is None:
            return None
        row["is_active"] = is_active
        return row
