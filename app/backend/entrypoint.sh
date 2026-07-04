#!/bin/sh
set -e
# (migrations + uvicorn launcher)

echo "[entrypoint] Running database migrations (alembic upgrade head)..."
alembic upgrade head

echo "[entrypoint] Starting API server on 0.0.0.0:8000..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
