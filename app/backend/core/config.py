"""Application settings loaded from environment variables."""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "HealthMonitor"
    app_version: str = "0.1.0"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/healthmonitor"

    jwt_secret_key: str = "CHANGE_ME"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    upload_dir: str = "uploads"
    max_upload_size_mb: int = 10

    ml_models_dir: str = "../../modele"

    abe_public_key_path: str = "abe_keys/master_public.key"
    abe_secret_key_path: str = "abe_keys/master_secret.key"

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = ""
    mail_server: str = ""
    mail_port: int = 587
    mail_starttls: bool = True
    mail_ssl_tls: bool = False

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Accept both JSON string and Python list formats."""
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
