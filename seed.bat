@echo off
REM Loads demo data into the running HealthMonitor stack (wipes existing data first).
REM Requires the stack to be up (start.bat). Accounts are listed in SEED_USERS.md.

echo Seeding demo data (this runs real ML inference and may take a minute)...
docker compose --profile seed run --rm seed
