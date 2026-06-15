"""HealthMonitor API — FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.middleware import setup_middleware
from api.routes import access_requests, admin, auth, chat_ws, conversations, health, patients, plans, predictions, relations, specialists, records, uploads, user_ws
from core.config import get_settings
from core.logging import setup_logging
from infrastructure.chat.in_memory_connection_manager import InMemoryChatConnectionManager
from infrastructure.crypto.abe_authority import ConcreteABEAuthority
from infrastructure.ml.loader import load_all_models

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events."""
    settings = get_settings()
    setup_logging(debug=settings.debug)
    logger.info(
        "Starting %s v%s (debug=%s)",
        settings.app_name,
        settings.app_version,
        settings.debug,
    )

    # Load ML models into app state so they are available to all handlers
    app.state.ml_models = load_all_models(settings.ml_models_dir)
    app.state.chat_manager = InMemoryChatConnectionManager()
    app.state.abe_authority = ConcreteABEAuthority.from_paths(
        Path(settings.abe_public_key_path),
        Path(settings.abe_secret_key_path),
    )

    yield

    # Cleanup
    app.state.ml_models = {}
    app.state.abe_authority = None
    logger.info("Shutting down %s", settings.app_name)


def create_app() -> FastAPI:
    """Application factory — builds and returns the configured FastAPI instance."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Platform for personalized health monitoring and predictive analytics.",
        lifespan=lifespan,
    )

    setup_middleware(app)

    uploads_dir = Path(settings.upload_dir)
    photos_dir = uploads_dir / "profile_photos"
    photos_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads/profile_photos", StaticFiles(directory=str(photos_dir)), name="profile_photos")

    # Route registration
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(admin.router)
    app.include_router(patients.router)
    app.include_router(specialists.router)
    app.include_router(records.router)
    app.include_router(predictions.router)
    app.include_router(relations.router)
    app.include_router(conversations.router)
    app.include_router(chat_ws.router)
    app.include_router(user_ws.router)
    app.include_router(access_requests.router)
    app.include_router(plans.router)
    app.include_router(uploads.router)

    return app


app = create_app()
