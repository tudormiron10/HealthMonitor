@echo off
REM Stops and removes the HealthMonitor containers. The database volume
REM (pgdata) is preserved, so your data survives the next start.bat.

echo Stopping HealthMonitor...
docker compose down
