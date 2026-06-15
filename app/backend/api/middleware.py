"""Application middleware — CORS and global error handling.

Centralizes cross-cutting concerns so that route handlers stay clean.
The error handler catches AppException subclasses and returns
a uniform JSON response.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import get_settings
from core.exceptions import AppException

logger = logging.getLogger(__name__)


def setup_middleware(app: FastAPI) -> None:
    """Register all middleware on the FastAPI application instance."""
    _setup_cors(app)
    _setup_error_handlers(app)


def _setup_cors(app: FastAPI) -> None:
    """Configure CORS to allow requests from the React frontend."""
    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def _setup_error_handlers(app: FastAPI) -> None:
    """Register global exception handlers for uniform error responses."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        logger.warning("AppException: %s (status=%d)", exc.message, exc.status_code)
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception: %s", str(exc))
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
        )
