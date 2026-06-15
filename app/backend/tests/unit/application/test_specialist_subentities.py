"""Unit tests for the specialist sub-entity services (work experience / education /
certification). All three share the same shape — profile resolution + ownership
guards — so one generic fake repo and a parametrized suite cover all three.
"""

import uuid

import pytest

from application.certification_service import CertificationService
from application.education_service import EducationService
from application.work_experience_service import WorkExperienceService
from core.exceptions import AppException
from tests.fakes import FakeSpecialistRepository

SERVICES = pytest.mark.parametrize(
    "service_cls",
    [WorkExperienceService, EducationService, CertificationService],
    ids=["work_experience", "education", "certification"],
)


class _FakeSubEntityRepo:
    """Generic dict-backed repo for the three sub-entity tables (same method shape)."""

    def __init__(self) -> None:
        self.rows: dict = {}

    def seed(self, row: dict) -> dict:
        self.rows[row["id"]] = row
        return row

    async def list_for_specialist(self, profile_id):
        return [r for r in self.rows.values() if r["specialist_profile_id"] == profile_id]

    async def add(self, profile_id, payload):
        row = {"id": uuid.uuid4(), "specialist_profile_id": profile_id, **payload}
        self.rows[row["id"]] = row
        return row

    async def get_by_id(self, entry_id):
        return self.rows.get(entry_id)

    async def update(self, entry_id, payload):
        row = self.rows[entry_id]
        row.update(payload)
        return row

    async def delete(self, entry_id):
        return self.rows.pop(entry_id, None) is not None


def _build(service_cls):
    repo = _FakeSubEntityRepo()
    specialist_repo = FakeSpecialistRepository()
    owner_user_id = uuid.uuid4()
    profile_id = uuid.uuid4()
    specialist_repo.seed({"id": profile_id, "user_id": owner_user_id})
    service = service_cls(repo=repo, specialist_repo=specialist_repo)
    return service, repo, owner_user_id, profile_id


@SERVICES
class TestSubEntityServices:
    async def test_given_owner_when_add_mine_then_inserts_under_their_profile(self, service_cls):
        # Arrange
        service, repo, owner, profile_id = _build(service_cls)

        # Act
        entry = await service.add_mine(owner, {})

        # Assert
        assert entry["specialist_profile_id"] == profile_id
        assert len(repo.rows) == 1

    async def test_given_missing_profile_when_add_mine_then_raises_404(self, service_cls):
        # Arrange
        service, _, _, _ = _build(service_cls)

        # Act + Assert — a user with no specialist profile
        with pytest.raises(AppException) as exc:
            await service.add_mine(uuid.uuid4(), {})
        assert exc.value.status_code == 404

    async def test_given_other_owners_entry_when_update_mine_then_raises_403(self, service_cls):
        # Arrange — entry belongs to a different specialist profile
        service, repo, owner, _ = _build(service_cls)
        foreign = repo.seed({"id": uuid.uuid4(), "specialist_profile_id": uuid.uuid4()})

        # Act + Assert
        with pytest.raises(AppException) as exc:
            await service.update_mine(owner, foreign["id"], {})
        assert exc.value.status_code == 403

    async def test_given_other_owners_entry_when_delete_mine_then_raises_403(self, service_cls):
        # Arrange
        service, repo, owner, _ = _build(service_cls)
        foreign = repo.seed({"id": uuid.uuid4(), "specialist_profile_id": uuid.uuid4()})

        # Act + Assert
        with pytest.raises(AppException) as exc:
            await service.delete_mine(owner, foreign["id"])
        assert exc.value.status_code == 403

    async def test_given_missing_entry_when_update_mine_then_raises_404(self, service_cls):
        # Arrange
        service, _, owner, _ = _build(service_cls)

        # Act + Assert
        with pytest.raises(AppException) as exc:
            await service.update_mine(owner, uuid.uuid4(), {})
        assert exc.value.status_code == 404
