@echo off
REM One-click launcher for the HealthMonitor stack (postgres + backend + frontend).
REM Builds images on first run, then starts everything. Press Ctrl+C to stop,
REM or run stop.bat. Frontend: http://localhost:5173  API: http://localhost:8000

echo Starting HealthMonitor (this may take a few minutes on the first run)...
docker compose up --build
