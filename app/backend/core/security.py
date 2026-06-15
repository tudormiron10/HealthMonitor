"""Security utilities for password hashing and JWT generation."""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt # type: ignore
from passlib.context import CryptContext # type: ignore

from core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify that a plain password matches a hashed payload."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a plain string password using BCrypt."""
    return pwd_context.hash(password)


def create_access_token(subject: str | Any, role: str, expires_delta: timedelta | None = None) -> str:
    """Generate a JWT payload for user authentication."""
    settings = get_settings()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
        
    to_encode = {
        "sub": str(subject), 
        "role": str(role), 
        "exp": expire
    }
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt
