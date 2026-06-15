"""Unit tests for IdentityService — registration and authentication."""

import uuid
from datetime import date
from types import SimpleNamespace

import pytest

from api.routes.schemas.auth_schemas import (
    PatientRegistrationRequest,
    SpecialistRegistrationRequest,
)
from application.identity_service import IdentityService
from core.exceptions import AppException, ForbiddenException
from core.security import get_password_hash
from infrastructure.persistence.models.enums import UserRole, VerificationStatus
from tests.fakes import (
    FakePatientRepository,
    FakeSpecialistRepository,
    FakeUserRepository,
)


@pytest.fixture
def repos():
    return FakeUserRepository(), FakePatientRepository(), FakeSpecialistRepository()


@pytest.fixture
def identity_service(repos):
    user_repo, patient_repo, specialist_repo = repos
    return IdentityService(user_repo, patient_repo, specialist_repo)


def _patient_request(email: str = "new.patient@gmail.com") -> PatientRegistrationRequest:
    return PatientRegistrationRequest(
        email=email,
        password="password123",
        first_name="Ana",
        last_name="Pop",
        date_of_birth=date(1990, 1, 1),
        sex=1,
    )


def _nutritionist_request(email: str = "new.spec@gmail.com") -> SpecialistRegistrationRequest:
    return SpecialistRegistrationRequest(
        email=email,
        password="password123",
        first_name="Dan",
        last_name="Ionescu",
        role=UserRole.NUTRITIONIST,
        institutie_absolvire="Universitatea de Medicina",
    )


class TestRegisterPatient:
    async def test_given_new_email_when_register_patient_then_creates_user_and_profile(
        self, identity_service, repos
    ):
        # Arrange
        user_repo, patient_repo, _ = repos

        # Act
        result = await identity_service.register_patient(_patient_request())

        # Assert
        assert result["role"] == "PATIENT"
        assert "user_id" in result
        assert len(user_repo.rows) == 1
        assert len(patient_repo.rows) == 1
        profile = next(iter(patient_repo.rows.values()))
        assert str(profile["user_id"]) == result["user_id"]

    async def test_given_existing_email_when_register_patient_then_raises_app_exception(
        self, identity_service, repos
    ):
        # Arrange
        user_repo, _, _ = repos
        user_repo.seed({"id": uuid.uuid4(), "email": "dup@gmail.com", "role": UserRole.PATIENT})

        # Act + Assert
        with pytest.raises(AppException) as exc:
            await identity_service.register_patient(_patient_request(email="dup@gmail.com"))
        assert exc.value.status_code == 400


class TestRegisterSpecialist:
    async def test_given_new_email_when_register_specialist_then_returns_token_and_pending(
        self, identity_service, repos
    ):
        # Arrange
        user_repo, _, specialist_repo = repos

        # Act
        result = await identity_service.register_specialist(_nutritionist_request())

        # Assert
        assert result["role"] == "NUTRITIONIST"
        assert result["access_token"]
        assert len(specialist_repo.rows) == 1
        user = next(iter(user_repo.rows.values()))
        assert user["verification_status"] == VerificationStatus.PENDING_VERIFICATION

    async def test_given_existing_email_when_register_specialist_then_raises_app_exception(
        self, identity_service, repos
    ):
        # Arrange
        user_repo, _, _ = repos
        user_repo.seed({"id": uuid.uuid4(), "email": "dup2@gmail.com", "role": UserRole.NUTRITIONIST})

        # Act + Assert
        with pytest.raises(AppException) as exc:
            await identity_service.register_specialist(_nutritionist_request(email="dup2@gmail.com"))
        assert exc.value.status_code == 400


class TestAuthenticate:
    def _seed_user(self, user_repo, *, password="password123", is_active=True):
        user = {
            "id": uuid.uuid4(),
            "email": "user@test.local",
            "password_hash": get_password_hash(password),
            "role": UserRole.PATIENT,
            "is_active": is_active,
        }
        user_repo.seed(user)
        return user

    async def test_given_valid_credentials_when_authenticate_then_returns_token_and_role(
        self, identity_service, repos
    ):
        # Arrange
        user_repo, _, _ = repos
        self._seed_user(user_repo)
        form = SimpleNamespace(username="user@test.local", password="password123")

        # Act
        result = await identity_service.authenticate_user(form)

        # Assert
        assert result["access_token"]
        assert result["token_type"] == "bearer"
        assert result["role"] == "PATIENT"

    async def test_given_unknown_email_when_authenticate_then_raises_401(
        self, identity_service
    ):
        # Arrange
        form = SimpleNamespace(username="nobody@test.local", password="whatever1")

        # Act + Assert
        with pytest.raises(AppException) as exc:
            await identity_service.authenticate_user(form)
        assert exc.value.status_code == 401

    async def test_given_wrong_password_when_authenticate_then_raises_401(
        self, identity_service, repos
    ):
        # Arrange
        user_repo, _, _ = repos
        self._seed_user(user_repo, password="correcthorse")
        form = SimpleNamespace(username="user@test.local", password="wrongpass1")

        # Act + Assert
        with pytest.raises(AppException) as exc:
            await identity_service.authenticate_user(form)
        assert exc.value.status_code == 401

    async def test_given_inactive_account_when_authenticate_then_raises_forbidden(
        self, identity_service, repos
    ):
        # Arrange — correct password, but the account is deactivated
        user_repo, _, _ = repos
        self._seed_user(user_repo, is_active=False)
        form = SimpleNamespace(username="user@test.local", password="password123")

        # Act + Assert
        with pytest.raises(ForbiddenException):
            await identity_service.authenticate_user(form)
