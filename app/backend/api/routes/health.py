"""Health check endpoint."""

from fastapi import APIRouter

from core.config import get_settings

router = APIRouter(tags=["System"])


@router.get("/health")
async def health_check() -> dict:
    """Return application status and version."""
    settings = get_settings()
    return {
        "status": "healthy",
        "version": settings.app_version,
        "app_name": settings.app_name,
    }
