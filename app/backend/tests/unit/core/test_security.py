"""Unit tests for core.security — password hashing and JWT generation."""

import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt

from core.config import get_settings
from core.security import create_access_token, get_password_hash, verify_password


def _decode(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


class TestPasswordHashing:
    def test_given_password_when_hashed_then_verify_returns_true(self):
        # Arrange
        password = "S3cret!pass"

        # Act
        hashed = get_password_hash(password)

        # Assert
        assert verify_password(password, hashed) is True

    def test_given_wrong_password_when_verify_then_returns_false(self):
        # Arrange
        hashed = get_password_hash("S3cret!pass")

        # Act + Assert
        assert verify_password("not-the-password", hashed) is False

    def test_given_password_when_hashed_then_hash_is_not_plaintext(self):
        # Arrange
        password = "S3cret!pass"

        # Act
        hashed = get_password_hash(password)

        # Assert — bcrypt output, never the raw password
        assert hashed != password
        assert hashed.startswith("$2")


class TestCreateAccessToken:
    def test_given_subject_and_role_when_create_token_then_decodes_with_sub_and_role(self):
        # Act
        token = create_access_token(subject="user-123", role="PATIENT")

        # Assert
        payload = _decode(token)
        assert payload["sub"] == "user-123"
        assert payload["role"] == "PATIENT"

    def test_given_token_when_created_then_contains_exp_claim(self):
        # Act
        token = create_access_token(subject="user-123", role="PATIENT")

        # Assert
        assert "exp" in _decode(token)

    def test_given_uuid_subject_when_create_token_then_sub_is_stringified(self):
        # Arrange
        user_id = uuid.uuid4()

        # Act
        token = create_access_token(subject=user_id, role="DOCTOR")

        # Assert
        assert _decode(token)["sub"] == str(user_id)

    def test_given_custom_expires_delta_when_create_token_then_exp_reflects_delta(self):
        # Act — five-minute expiry
        token = create_access_token(subject="u", role="PATIENT", expires_delta=timedelta(minutes=5))

        # Assert — exp ~ now + 300s (allow clock/encoding slack)
        exp = _decode(token)["exp"]
        expected = datetime.now(timezone.utc).timestamp() + 300
        assert abs(exp - expected) < 30
