# HealthMonitor

HealthMonitor is a full-stack E-Health platform that turns laboratory results
into understandable, personalized health insights. A patient can upload or
enter medical markers, review the extracted values, receive risk estimates for
eight chronic conditions, and communicate with an approved care team.

The project was developed as a bachelor's thesis and demonstrates Clean
Architecture, machine-learning inference, PostgreSQL persistence, real-time
communication, and fine-grained access control for sensitive medical markers.

HealthMonitor is a **decision-support system, not a diagnostic tool**. Its
predictions do not replace consultation with a licensed medical professional.

## What the platform does

- Parses text-based laboratory PDFs and lets the patient review and correct the extracted markers before saving.
- Evaluates eight conditions: diabetes, hypertension, dyslipidemia, anemia, cardiovascular risk, hepatic steatosis, chronic kidney disease, and metabolic syndrome.
- Uses Model B as the production model and optionally runs Model A as contextual confirmation when decisive markers are present.
- Calculates a weighted Health Score from 0 to 100 and sends red-flag notifications when a condition probability reaches 70%.
- Shows marker trends, clinical reference ranges, record comparisons, prediction history, and downloadable PDF reports.
- Supports patients, doctors, nutritionists, coaches, and administrators with role-specific workflows.
- Provides real-time chat, system risk alerts, granular marker-access requests, and personalized meal or workout plans.
- Supports Romanian and English through the frontend internationalization layer.
- Provides password reset, specialist verification, public specialist profiles, and authenticated document access.

## Machine-learning pipeline

The models are trained on four NHANES cycles from 2013-2020. After preprocessing,
the training data contains approximately 11,400 adult records and 26 clinical
markers covering demographic, cardiovascular, metabolic, hepatic, renal, and
hematologic information.

The training pipeline uses:

- MICE imputation with `IterativeImputer` and `BayesianRidge`;
- `StandardScaler` for feature scaling;
- SMOTE and model-specific class weighting for imbalanced targets;
- Logistic Regression, Random Forest, and XGBoost candidates;
- stratified cross-validation and F1-macro as the primary evaluation metric;
- serialized model bundles containing the estimator, imputer, scaler, and feature metadata.

There are two model variants per condition:

- **Model A** sees all available markers, including markers that directly define a target. It is used as contextual confirmation only.
- **Model B** excludes those decisive markers to reduce data leakage and is always used for the production prediction and Health Score.

The best production models achieve F1-macro values between 0.632 and 0.914,
with AUC-ROC values between 0.823 and 0.969 where binary AUC is applicable.
These results are based on NHANES and require further clinical validation on
Romanian patients before production use.

## Security model

The platform combines JWT authentication and role-based authorization with
marker-level encryption inspired by Ciphertext-Policy Attribute-Based
Encryption (CP-ABE).

Each non-null medical marker is encrypted separately with an access policy that
combines:

- the specialist's medical specialization;
- the specific patient identifier;
- optional marker attributes granted through explicit patient consent.

This gives the application granular access, revocation, and consent extension
without re-encrypting existing marker ciphertexts. PostgreSQL stores encrypted
marker payloads for new records, while legacy plaintext records remain
supported through a compatibility path.

The current implementation is an explicitly documented **thesis-grade
simulation**, based on AES-256-GCM and HMAC-SHA256. It is not a production
CP-ABE implementation: collusion resistance is not cryptographically
guaranteed and the master key is stored locally. A production deployment would
replace the crypto adapter with a real CP-ABE library and protect the master
key with an HSM or KMS.

## Architecture

The backend and frontend follow a Clean Architecture / ports-and-adapters
structure. Business rules depend on abstract contracts rather than directly on
framework or storage implementations.

The backend is organized into four main layers:

- `api/` exposes REST and WebSocket routes, validates requests with Pydantic, and wires dependencies through FastAPI.
- `application/` contains the use-case services for authentication, records, predictions, relations, chat, plans, reports, and access requests.
- `domain/ports/` defines the abstract repository and service contracts used by the application layer.
- `infrastructure/` provides the concrete adapters for PostgreSQL and SQLAlchemy, ML model loading, PDF parsing, local files, email, WebSockets, and marker encryption.

The frontend communicates with the backend through HTTP/JSON and WebSockets.
The backend services depend on the contracts in `domain/ports/`, while the
infrastructure adapters implement those contracts. This keeps the business
logic independent from FastAPI, PostgreSQL, and other replaceable technical
details.

Important backend areas:

- `app/backend/api/` contains REST and WebSocket routes plus Pydantic schemas.
- `app/backend/application/` contains use-case services such as prediction, records, relations, chat, plans, and access requests.
- `app/backend/domain/ports/` contains dependency inversion interfaces.
- `app/backend/infrastructure/` contains concrete persistence, ML, parsing, storage, crypto, and notification adapters.
- `app/backend/core/` contains configuration, security helpers, constants, logging, and exceptions.
- `app/frontend/src/` mirrors the same separation with `presentation`, `application`, `infrastructure`, and `domain` layers.
- `modele/` contains the training scripts and serialized model artifacts.
- `preprocesare/` contains the NHANES preprocessing scripts.

## Technology stack

| Area | Technologies |
| --- | --- |
| Backend | Python 3.12, FastAPI, Uvicorn, Pydantic, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16, asyncpg, JSONB, UUID, PostgreSQL enums |
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS 4 |
| Data and ML | pandas, NumPy, scikit-learn, XGBoost, imbalanced-learn, joblib |
| Security | JWT, bcrypt, AES-256-GCM, HMAC-SHA256, simulated CP-ABE policies |
| Documents | pdfplumber for parsing, fpdf2 for reports and plan PDFs |
| Real-time | WebSockets for chat and user notifications |
| Testing | pytest, pytest-asyncio, Vitest, jsdom |

## Quick start with Docker

Docker Desktop is the recommended way to run the complete stack on Windows.
From the repository root:

```powershell
docker compose up --build
```

The compose stack starts PostgreSQL, runs Alembic migrations automatically,
starts the FastAPI backend, and serves the React frontend through Nginx.

Open:

- Frontend: <http://localhost:5173>
- Backend health check: <http://localhost:8000/health>
- Interactive API documentation: <http://localhost:8000/docs>

To load the reproducible demo dataset into the Docker database:

```powershell
docker compose --profile seed run --rm seed
```

The seed creates users, specialist relationships, encrypted medical records,
predictions, conversations, access requests, and plan messages. Demo accounts
and the shared password are listed in [SEED_USERS.md](SEED_USERS.md).

Stop the stack with:

```powershell
docker compose down
```

The named PostgreSQL volume is preserved. Use `start.bat`, `stop.bat`, and
`seed.bat` as Windows shortcuts for the same operations.

## Local development

### Backend

Prerequisites: Python 3.12+ and a running PostgreSQL database.

```powershell
cd app/backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Set `DATABASE_URL` and `JWT_SECRET_KEY` in `.env`, then run:

```powershell
alembic upgrade head
python -m uvicorn main:app --port 8000 --reload
```

The backend expects the model directory and local `abe_keys/` and `uploads/`
directories to be available. The Docker setup configures these mounts
automatically.

### Frontend

```powershell
cd app/frontend
npm install
npm run dev
```

The Vite development server runs at <http://localhost:5173>.

## Testing and quality checks

Backend tests use fake repositories and do not require a database:

```powershell
cd app/backend
pytest
```

Frontend checks:

```powershell
cd app/frontend
npm run test:run
npm run build
npm run lint
```

## Repository map

```text
app/backend/       FastAPI application, migrations, tests, and seed script
app/frontend/      React application and frontend tests
date/procesate/    Condition-specific processed datasets
modele/            NHANES training code and serialized .pkl models
preprocesare/      Dataset construction and cleaning scripts
docker-compose.yml Complete Docker stack definition
start.bat          Start the Docker stack on Windows
stop.bat           Stop the Docker stack on Windows
seed.bat           Load the demo dataset on Windows
SEED_USERS.md      Demo accounts and walkthrough notes
```

## Project status and limitations

The repository contains a working thesis prototype with Docker deployment,
demo data, unit tests, PDF reports, real-time messaging, and encrypted medical
records. The following are intentionally future-facing concerns:

- clinical validation and recalibration on Romanian patient data;
- replacing the CP-ABE simulation with a production cryptographic adapter;
- moving the master key to HSM/KMS-backed key management;
- replacing local file storage with managed object storage;
- automated verification against professional registries;
- production observability, CI/CD, and cloud deployment hardening.

