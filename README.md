# HealthMonitor
Once running:
- Backend API: http://localhost:8000  (docs: http://localhost:8000/docs)
- Frontend app: http://localhost:5173

## Quick start with Docker (one command)

Requires Docker Desktop. From the project root:

```bash
docker compose up --build        # or double-click start.bat on Windows
```

This starts PostgreSQL, the backend (migrations run automatically), and the
frontend. Then optionally load demo data:

```bash
docker compose --profile seed run --rm seed     # or double-click seed.bat
```

Demo accounts and the shared password are listed in **[SEED_USERS.md](SEED_USERS.md)**.
Stop everything with `docker compose down` (or `stop.bat`); the database volume persists.

## Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL (create an empty database, e.g. `healthmonitor`)

## Backend

```bash
cd app/backend

# 1. Create & activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1      # Windows PowerShell
# source venv/bin/activate       # macOS / Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env           # then edit DATABASE_URL and JWT_SECRET_KEY
# cp .env.example .env           # macOS / Linux

# 4. Apply database migrations
alembic upgrade head

# 5. (optional) Seed demo data
python seed.py

# 6. Run the API  ->  http://localhost:8000
python -m uvicorn main:app --port 8000 --reload
```

## Frontend

```bash
cd app/frontend
npm install
npm run dev                       # -> http://localhost:5173
```

## Notes

- Trained ML models (`modele/**/*.pkl`) are included in the repo.
- ABE master keys and the `uploads/` directory are created automatically on first run.
