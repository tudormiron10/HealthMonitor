"""Alembic migration environment configuration."""

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool  # type: ignore

from alembic import context # type: ignore

from core.config import get_settings

# Import Base and all models so Alembic sees them
from infrastructure.persistence.database import Base
from infrastructure.persistence.models.orm_models import (  # noqa: F401
    UserORM,
    PatientProfileORM,
    SpecialistProfileORM,
    PatientSpecialistRelationORM,
    MedicalRecordORM,
    MLPredictionORM,
    SpecialistWorkExperienceORM,
    SpecialistEducationORM,
    SpecialistCertificationORM,
    ABEUserKeyORM,
    AccessRequestORM,
)

# Alembic Config object
config = context.config

# Override sqlalchemy.url from our app settings (sync driver for migrations)
settings = get_settings()
sync_url = settings.database_url.replace("+asyncpg", "+psycopg")
config.set_main_option("sqlalchemy.url", sync_url)

# Setup logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (SQL script generation)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (direct DB connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
