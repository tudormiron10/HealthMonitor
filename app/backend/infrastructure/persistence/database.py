"""Async database engine, session factory, and declarative base.

Provides the SQLAlchemy async infrastructure used by all ORM models
and repository adapters. Session lifecycle is managed through the
get_db() async generator for FastAPI dependency injection.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine # type: ignore
from sqlalchemy.orm import DeclarativeBase # type: ignore

from core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db():
    """Yield an async database session for dependency injection."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
