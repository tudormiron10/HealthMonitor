"""HealthMonitor demo-data seed.

Populates a fresh database with realistic, Romanian-context demo data spanning
every role and the full feature surface: users + profiles, patient-specialist
relations, encrypted medical records, real ML predictions, ABE keys with
partial consent, chat, and plans.

Run from app/backend (so relative abe_keys/ and ML model paths resolve):
    python seed.py            # idempotent: skips if already seeded
    python seed.py --reset    # wipe demo tables first, then rebuild

The script reuses the application services (RecordService for ABE encryption,
PredictionService for real inference) so seeded data is identical to what the
live app would produce. All demo accounts share one password (see PASSWORD).
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import unicodedata
import warnings

# The RandomForest models were fitted without feature names; passing a named
# DataFrame at inference triggers a benign sklearn UserWarning on every call.
warnings.filterwarnings("ignore", message="X has feature names")
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from random import Random
from uuid import UUID

# Romanian names carry diacritics; the Windows cp1252 console raises
# UnicodeEncodeError on print without this (mirrors core/logging.py).
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from sqlalchemy import text

from api.routes.schemas.record_schemas import MedicalMarkers, MedicalRecordCreate
from application.prediction_service import MODEL_VERSION, PredictionService
from application.record_service import RecordService
from core.config import get_settings
from core.constants import MARKER_TO_SPECIALIZATIONS
from core.security import get_password_hash
from infrastructure.crypto.abe_authority import ConcreteABEAuthority
from infrastructure.ml.loader import load_all_models
from infrastructure.persistence.database import async_session_maker, engine
from infrastructure.persistence.models.enums import (
    AccessRequestStatus,
    CertificationType,
    MedicalSpecialization,
    MedicGrade,
    MessageKind,
    RelationStatus,
    UserRole,
    VerificationStatus,
)
from infrastructure.persistence.models.orm_models import (
    ABEUserKeyORM,
    AccessRequestORM,
    ConversationORM,
    MessageORM,
    PatientProfileORM,
    PatientSpecialistRelationORM,
    SpecialistCertificationORM,
    SpecialistEducationORM,
    SpecialistProfileORM,
    SpecialistWorkExperienceORM,
    UserORM,
)
from infrastructure.persistence.repositories.prediction_repository import SqlAlchemyPredictionRepository
from infrastructure.persistence.repositories.record_repository import SqlAlchemyRecordRepository

PASSWORD = "Password123!"
RANDOM_SEED = 42
ADMIN_EMAIL = "admin@healthmonitor.ro"

_SEEDED_TABLES = [
    "user_plan_archives", "access_requests", "abe_user_keys", "messages",
    "conversations", "ml_predictions", "medical_records",
    "specialist_certifications", "specialist_education", "specialist_work_experience",
    "patient_specialist_relations", "specialist_profiles", "patient_profiles",
    "password_reset_tokens", "users",
]

_MS = MedicalSpecialization


def _slug(value: str) -> str:
    """ASCII, lowercase, dot-joined form of a name for email local-parts."""
    stripped = "".join(
        c for c in unicodedata.normalize("NFKD", value) if not unicodedata.combining(c)
    )
    return stripped.lower().replace(" ", ".")


# Specialists: (first, last, role, specialization, credential kwargs, extended kwargs)
SPECIALISTS = [
    {
        "first": "Andrei", "last": "Popescu", "role": UserRole.DOCTOR, "spec": _MS.CARDIOLOGIE,
        "cod_parafa": "AP102345", "unitate_sanitara": "Spitalul Universitar de Urgență București",
        "license_number": "RO-CARD-1187", "grad": MedicGrade.PRIMAR,
        "bio": "Medic primar cardiolog cu peste 15 ani de experiență în managementul riscului cardiovascular.",
    },
    {
        "first": "Elena", "last": "Ionescu", "role": UserRole.DOCTOR, "spec": _MS.ENDOCRINOLOGIE,
        "cod_parafa": "EI203456", "unitate_sanitara": "Clinica Regina Maria, București",
        "license_number": "RO-ENDO-2231", "grad": MedicGrade.SPECIALIST,
        "bio": "Endocrinolog specializat în diabet, dislipidemii și boli metabolice.",
    },
    {
        "first": "Mihai", "last": "Dumitrescu", "role": UserRole.DOCTOR, "spec": _MS.NEFROLOGIE,
        "cod_parafa": "MD304567", "unitate_sanitara": "Spitalul Clinic Județean de Urgență Cluj-Napoca",
        "license_number": "RO-NEFRO-3390", "grad": MedicGrade.SPECIALIST,
        "bio": "Nefrolog cu interes în boala cronică de rinichi și hipertensiunea reno-vasculară.",
    },
    {
        "first": "Ioana", "last": "Munteanu", "role": UserRole.DOCTOR, "spec": _MS.HEMATOLOGIE,
        "cod_parafa": "IM405678", "unitate_sanitara": "Institutul Clinic Fundeni, București",
        "license_number": "RO-HEMA-4412", "grad": MedicGrade.PRIMAR,
        "bio": "Medic primar hematolog, focus pe anemii și tulburări ale hemoglobinei.",
    },
    {
        "first": "Gabriela", "last": "Stoica", "role": UserRole.NUTRITIONIST, "spec": _MS.NUTRITIONIST,
        "numar_ondr": "ONDR-10012", "institutie_absolvire": "UMF Carol Davila, București",
        "license_number": "RO-NUTR-5501", "nutritie": ["CLINICA"],
        "bio": "Nutriționist-dietetician, planuri alimentare personalizate pentru sindrom metabolic.",
    },
    {
        "first": "Cristina", "last": "Marin", "role": UserRole.NUTRITIONIST, "spec": _MS.NUTRITIONIST,
        "numar_ondr": "ONDR-10027", "institutie_absolvire": "UMF Iuliu Hațieganu, Cluj-Napoca",
        "license_number": "RO-NUTR-5588", "nutritie": ["SPORTIVA"],
        "bio": "Nutriție sportivă și compoziție corporală pentru persoane active.",
    },
    {
        "first": "Bogdan", "last": "Stan", "role": UserRole.COACH, "spec": _MS.COACH,
        "tip_certificare": CertificationType.ISSA, "numar_certificare": "ISSA-778812",
        "sportiva": ["FITNESS_GENERAL"],
        "bio": "Antrenor personal certificat ISSA, antrenament de forță și anduranță.",
    },
    {
        "first": "Raluca", "last": "Florea", "role": UserRole.COACH, "spec": _MS.COACH,
        "tip_certificare": CertificationType.NASM, "numar_certificare": "NASM-550214",
        "sportiva": ["RECUPERARE"],
        "bio": "Antrenor personal NASM, specializat în recuperare și kinetoprofilaxie.",
    },
]

# Patients: (first, last, sex 1=M/2=F, archetype, birth year)
PATIENTS = [
    {"first": "Maria", "last": "Popa", "sex": 2, "archetype": "healthy", "birth_year": 1992},
    {"first": "Ștefan", "last": "Gheorghe", "sex": 1, "archetype": "metabolic", "birth_year": 1968},
    {"first": "Andreea", "last": "Constantin", "sex": 2, "archetype": "anemic", "birth_year": 1990},
    {"first": "Cristian", "last": "Nistor", "sex": 1, "archetype": "cardiovascular", "birth_year": 1962},
    {"first": "Alexandra", "last": "Mateescu", "sex": 2, "archetype": "healthy", "birth_year": 1985},
    {"first": "Vlad", "last": "Stoica", "sex": 1, "archetype": "renal", "birth_year": 1959},
    {"first": "Diana", "last": "Radu", "sex": 2, "archetype": "metabolic", "birth_year": 1979},
    {"first": "Gabriel", "last": "Dumitru", "sex": 1, "archetype": "cardiovascular", "birth_year": 1971},
    {"first": "Bianca", "last": "Marin", "sex": 2, "archetype": "anemic", "birth_year": 1995},
    {"first": "Radu", "last": "Florescu", "sex": 1, "archetype": "healthy", "birth_year": 1988},
]

# (patient_index, specialist_index, status, consent) — consent: None | "granted" | "pending"
RELATIONS = [
    (0, 0, RelationStatus.APPROVED, "granted"),
    (0, 4, RelationStatus.APPROVED, None),
    (1, 1, RelationStatus.APPROVED, "granted"),
    (1, 5, RelationStatus.PENDING, None),
    (2, 3, RelationStatus.APPROVED, "pending"),
    (3, 0, RelationStatus.APPROVED, "granted"),
    (3, 6, RelationStatus.APPROVED, None),
    (4, 1, RelationStatus.APPROVED, None),
    (5, 2, RelationStatus.APPROVED, "granted"),
    (6, 4, RelationStatus.APPROVED, None),
    (6, 1, RelationStatus.REJECTED, None),
    (7, 0, RelationStatus.APPROVED, "pending"),
    (7, 7, RelationStatus.REVOKED, None),
    (8, 3, RelationStatus.APPROVED, "granted"),
    (9, 6, RelationStatus.PENDING, None),
]


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def make_markers(archetype: str, sex: int, rng: Random, drift: float) -> dict:
    """Generate clinically plausible markers for an archetype.

    ``drift`` in [-1, 1] nudges severity across a patient's record history so
    trend charts show movement. Values are clamped to the schema's valid ranges.
    """
    male = sex == 1
    m: dict[str, float] = {
        "bmi": _clamp(rng.uniform(21.5, 24.5), 16, 45),
        "waist_circumference": _clamp((92 if male else 78) + rng.uniform(-4, 4), 55, 160),
        "smoker_status": 0,
        "systolic_bp": _clamp(rng.uniform(112, 124), 90, 200),
        "diastolic_bp": _clamp(rng.uniform(70, 80), 55, 120),
        "hba1c": _clamp(rng.uniform(5.0, 5.5), 4.0, 14.0),
        "fasting_glucose": _clamp(rng.uniform(82, 95), 60, 350),
        "total_cholesterol": _clamp(rng.uniform(165, 195), 90, 400),
        "hdl": _clamp(rng.uniform(52, 66) if not male else rng.uniform(44, 58), 20, 120),
        "ldl": _clamp(rng.uniform(95, 120), 40, 300),
        "triglycerides": _clamp(rng.uniform(80, 135), 40, 800),
        "alt": _clamp(rng.uniform(16, 32), 5, 400),
        "ast": _clamp(rng.uniform(16, 30), 5, 400),
        "ggt": _clamp(rng.uniform(15, 38), 5, 600),
        "crp": _clamp(rng.uniform(0.4, 2.6), 0, 100),
        "creatinine": _clamp(rng.uniform(0.75, 1.05) if male else rng.uniform(0.6, 0.9), 0.3, 12),
        "urea": _clamp(rng.uniform(22, 40), 8, 200),
        "uacr": _clamp(rng.uniform(4, 18), 0, 2000),
        "uric_acid": _clamp(rng.uniform(3.8, 6.0), 1.5, 14),
        "hemoglobin": _clamp(rng.uniform(13.8, 16.0) if male else rng.uniform(12.6, 14.8), 5, 20),
        "mcv": _clamp(rng.uniform(86, 94), 60, 110),
        "ferritin": _clamp(rng.uniform(60, 200) if male else rng.uniform(35, 130), 3, 1000),
        "vitamin_d": _clamp(rng.uniform(26, 44), 5, 100),
        "folate": _clamp(rng.uniform(7, 18), 2, 60),
    }

    s = 1.0 + 0.25 * drift  # severity multiplier for the affected markers

    if archetype == "metabolic":
        m["bmi"] = _clamp(rng.uniform(31, 37) * s, 16, 45)
        m["waist_circumference"] = _clamp((108 if male else 96) * s, 55, 160)
        m["hba1c"] = _clamp(rng.uniform(6.1, 7.4) * s, 4.0, 14.0)
        m["fasting_glucose"] = _clamp(rng.uniform(126, 175) * s, 60, 350)
        m["triglycerides"] = _clamp(rng.uniform(210, 360) * s, 40, 800)
        m["hdl"] = _clamp(rng.uniform(30, 40) / s, 20, 120)
        m["total_cholesterol"] = _clamp(rng.uniform(215, 260) * s, 90, 400)
        m["ldl"] = _clamp(rng.uniform(140, 185) * s, 40, 300)
        m["alt"] = _clamp(rng.uniform(42, 70) * s, 5, 400)
        m["ggt"] = _clamp(rng.uniform(60, 120) * s, 5, 600)
    elif archetype == "cardiovascular":
        m["systolic_bp"] = _clamp(rng.uniform(146, 168) * s, 90, 200)
        m["diastolic_bp"] = _clamp(rng.uniform(92, 104) * s, 55, 120)
        m["total_cholesterol"] = _clamp(rng.uniform(245, 295) * s, 90, 400)
        m["ldl"] = _clamp(rng.uniform(165, 215) * s, 40, 300)
        m["hdl"] = _clamp(rng.uniform(30, 38) / s, 20, 120)
        m["triglycerides"] = _clamp(rng.uniform(185, 300) * s, 40, 800)
        m["smoker_status"] = 1
    elif archetype == "anemic":
        m["hemoglobin"] = _clamp((rng.uniform(9.6, 11.4)) / s, 5, 20)
        m["ferritin"] = _clamp(rng.uniform(5, 18) / s, 3, 1000)
        m["mcv"] = _clamp(rng.uniform(70, 79), 60, 110)
        m["folate"] = _clamp(rng.uniform(2.5, 5.5), 2, 60)
    elif archetype == "renal":
        m["creatinine"] = _clamp(rng.uniform(1.7, 3.2) * s, 0.3, 12)
        m["urea"] = _clamp(rng.uniform(65, 115) * s, 8, 200)
        m["uacr"] = _clamp(rng.uniform(120, 1100) * s, 0, 2000)
        m["uric_acid"] = _clamp(rng.uniform(7.6, 9.8) * s, 1.5, 14)
        m["systolic_bp"] = _clamp(rng.uniform(140, 160) * s, 90, 200)

    rounded = {k: round(v, 1) for k, v in m.items()}
    rounded["smoker_status"] = int(m["smoker_status"])
    return rounded


async def already_seeded(session) -> bool:
    result = await session.execute(
        text("SELECT 1 FROM users WHERE email = :e"), {"e": ADMIN_EMAIL}
    )
    return result.first() is not None


async def reset(session) -> None:
    await session.execute(
        text(f"TRUNCATE {', '.join(_SEEDED_TABLES)} RESTART IDENTITY CASCADE")
    )
    await session.flush()


async def seed_users(session, rng: Random) -> tuple[UserORM, list[dict], list[dict]]:
    """Create the admin, specialists (APPROVED) and patients with profiles."""
    pwd_hash = get_password_hash(PASSWORD)

    admin = UserORM(email=ADMIN_EMAIL, password_hash=pwd_hash, role=UserRole.ADMIN, is_active=True)
    session.add(admin)
    await session.flush()

    specialists: list[dict] = []
    for spec in SPECIALISTS:
        email = f"{_slug(spec['first'])}.{_slug(spec['last'])}@medic.ro"
        user = UserORM(
            email=email, password_hash=pwd_hash, role=spec["role"], is_active=True,
            verification_status=VerificationStatus.APPROVED,
        )
        session.add(user)
        await session.flush()

        profile = SpecialistProfileORM(
            user_id=user.id, first_name=spec["first"], last_name=spec["last"],
            specialization=spec["spec"], license_number=spec.get("license_number"),
            cod_parafa=spec.get("cod_parafa"), unitate_sanitara=spec.get("unitate_sanitara"),
            numar_ondr=spec.get("numar_ondr"), institutie_absolvire=spec.get("institutie_absolvire"),
            tip_certificare=spec.get("tip_certificare"), numar_certificare=spec.get("numar_certificare"),
            grad_profesional=spec.get("grad"),
            bio=spec.get("bio"), limbi_vorbite=["RO", "EN"],
            program_lucru="Luni-Vineri, 09:00-17:00",
            specializare_nutritie=spec.get("nutritie", []),
            specializare_sportiva=spec.get("sportiva", []),
            verified_at=datetime.now(timezone.utc), verified_by_admin_id=admin.id,
        )
        session.add(profile)
        await session.flush()

        session.add(SpecialistEducationORM(
            specialist_profile_id=profile.id,
            institution=spec.get("institutie_absolvire", "UMF Carol Davila, București"),
            degree="Doctor-Medic" if spec["role"] == UserRole.DOCTOR else "Licență",
            field_of_study=spec["spec"].value, year_completed=rng.randint(2005, 2018),
        ))
        session.add(SpecialistWorkExperienceORM(
            specialist_profile_id=profile.id,
            title=spec["spec"].value,
            employer=spec.get("unitate_sanitara") or spec.get("institutie_absolvire") or "Cabinet privat",
            location="București", start_date=date(rng.randint(2012, 2019), 9, 1),
        ))
        if spec.get("tip_certificare"):
            session.add(SpecialistCertificationORM(
                specialist_profile_id=profile.id,
                name=f"Certificare {spec['tip_certificare'].value}",
                issuing_body=spec["tip_certificare"].value,
                certification_number=spec.get("numar_certificare"),
                issue_date=date(rng.randint(2016, 2022), 3, 15),
            ))

        specialists.append({"user": user, "profile": profile, "data": spec})

    patients: list[dict] = []
    for p in PATIENTS:
        email = f"{_slug(p['first'])}.{_slug(p['last'])}@email.ro"
        user = UserORM(email=email, password_hash=pwd_hash, role=UserRole.PATIENT, is_active=True)
        session.add(user)
        await session.flush()

        dob = date(p["birth_year"], rng.randint(1, 12), rng.randint(1, 28))
        profile = PatientProfileORM(
            user_id=user.id, first_name=p["first"], last_name=p["last"],
            date_of_birth=dob, sex=p["sex"],
        )
        session.add(profile)
        await session.flush()
        patients.append({"user": user, "profile": profile, "data": p, "dob": dob})

    return admin, specialists, patients


async def seed_relations(session, patients, specialists) -> list[dict]:
    """Create relations; return the APPROVED ones with consent metadata."""
    approved: list[dict] = []
    for p_idx, s_idx, status, consent in RELATIONS:
        patient = patients[p_idx]
        specialist = specialists[s_idx]
        session.add(PatientSpecialistRelationORM(
            patient_id=patient["user"].id, specialist_id=specialist["user"].id,
            status=status, initiated_by=UserRole.PATIENT,
        ))
        if status == RelationStatus.APPROVED:
            approved.append({"patient": patient, "specialist": specialist, "consent": consent})
    await session.flush()
    return approved


async def seed_chat(session, approved) -> dict:
    """One conversation per APPROVED relation, with text messages and plans."""
    conversations: dict[tuple, ConversationORM] = {}
    for pair in approved:
        patient_uid = pair["patient"]["user"].id
        spec_uid = pair["specialist"]["user"].id
        conv = ConversationORM(patient_user_id=patient_uid, specialist_user_id=spec_uid)
        session.add(conv)
        await session.flush()
        conversations[(patient_uid, spec_uid)] = conv

        p_name = pair["patient"]["data"]["first"]
        session.add(MessageORM(
            conversation_id=conv.id, sender_id=patient_uid, message_kind=MessageKind.TEXT,
            message_text="Bună ziua, am încărcat ultimele analize. Aștept părerea dumneavoastră.",
            is_read=True,
        ))
        session.add(MessageORM(
            conversation_id=conv.id, sender_id=spec_uid, message_kind=MessageKind.TEXT,
            message_text=f"Bună ziua, {p_name}. Am primit analizele, le verific și revin.",
            is_read=False,
        ))

        role = pair["specialist"]["data"]["role"]
        if role == UserRole.NUTRITIONIST:
            session.add(MessageORM(
                conversation_id=conv.id, sender_id=spec_uid, message_kind=MessageKind.MEAL_PLAN,
                message_text="Plan alimentar - 4 săptămâni",
                payload={
                    "title": "Plan alimentar - 4 săptămâni",
                    "content": ("Mic dejun: ovăz cu fructe de pădure.\n"
                                "Prânz: piept de pui la grătar cu legume.\n"
                                "Cină: pește alb cu salată.\n"
                                "Hidratare: minim 2 litri apă/zi."),
                },
                is_read=False,
            ))
        elif role == UserRole.COACH:
            session.add(MessageORM(
                conversation_id=conv.id, sender_id=spec_uid, message_kind=MessageKind.WORKOUT_PLAN,
                message_text="Program de antrenament - începător",
                payload={
                    "title": "Program de antrenament - începător",
                    "content": ("Luni: full-body, 3 serii x 12 repetări.\n"
                                "Miercuri: cardio 30 min, intensitate moderată.\n"
                                "Vineri: forță picioare + core.\n"
                                "Recuperare: 8 ore somn, stretching zilnic."),
                },
                is_read=False,
            ))
    await session.flush()
    return conversations


async def seed_records(session, patients, ml_models, abe, conversations, rng: Random) -> None:
    """Per patient: 10-12 encrypted records + real predictions; red flags on the latest."""
    record_service = RecordService(SqlAlchemyRecordRepository(session), abe)
    prediction_service = PredictionService()
    prediction_repo = SqlAlchemyPredictionRepository(session)

    for patient in patients:
        profile_id = patient["profile"].id
        patient_uid = patient["user"].id
        archetype = patient["data"]["archetype"]
        sex = patient["data"]["sex"]
        age = (date.today() - patient["dob"]).days / 365.25
        n_records = rng.randint(10, 12)

        latest_flagged: list[str] = []
        latest_ids: tuple | None = None

        for i in range(n_records):
            months_ago = n_records - 1 - i
            record_date = date.today() - timedelta(days=30 * months_ago)
            drift = (i / (n_records - 1)) * 2 - 1  # -1 (oldest) -> +1 (newest)

            markers = make_markers(archetype, sex, rng, drift)
            markers["sex"] = sex
            markers["age"] = round(age - months_ago / 12.0, 1)

            # All MANUAL_ENTRY: the seed cannot produce real PDF files, so it
            # avoids PDF_PARSED rows that would render a broken document link.
            record_in = MedicalRecordCreate(
                record_date=record_date,
                markers=MedicalMarkers(**markers),
            )
            saved = await record_service.add_manual_entry(
                profile_id, record_in, patient_user_id=patient_uid,
            )

            raw = record_in.markers.model_dump(exclude_none=True)
            metrics = prediction_service.run_predictions(raw, ml_models)
            health_score = prediction_service.calculate_health_score(metrics)
            saved_pred = await prediction_repo.save({
                "medical_record_id": saved["id"],
                "model_version": MODEL_VERSION,
                "metrics": metrics,
                "health_score": health_score,
            })

            if i == n_records - 1:
                latest_flagged = [
                    cond for cond, d in metrics.items()
                    if isinstance(d, dict) and (d.get("probability") or 0) >= 0.7
                ]
                latest_ids = (saved["id"], saved_pred["id"])

        if latest_flagged and latest_ids:
            for (p_uid, s_uid), conv in conversations.items():
                if p_uid == patient_uid:
                    session.add(MessageORM(
                        conversation_id=conv.id, sender_id=None,
                        message_kind=MessageKind.SYSTEM_RED_FLAG,
                        message_text="Flag roșu",
                        payload={
                            "conditions": latest_flagged,
                            "record_id": str(latest_ids[0]),
                            "prediction_id": str(latest_ids[1]),
                        },
                        is_read=False,
                    ))
    await session.flush()


def _out_of_spec_markers(spec: MedicalSpecialization, rng: Random, count: int) -> list[str]:
    """Pick non-universal markers NOT covered by this specialization (consent targets)."""
    candidates = [
        m for m, specs in MARKER_TO_SPECIALIZATIONS.items()
        if specs and spec not in specs
    ]
    rng.shuffle(candidates)
    return candidates[:count]


async def seed_abe(session, approved, abe, conversations, rng: Random) -> None:
    """Issue every APPROVED specialist a key (spec + patient attrs); add consent."""
    msk = abe.master_secret_key
    for pair in approved:
        spec_enum: MedicalSpecialization = pair["specialist"]["data"]["spec"]
        patient_uid = pair["patient"]["user"].id
        spec_uid = pair["specialist"]["user"].id

        base_attrs = [f"patient:{patient_uid}"]
        if spec_enum is not MedicalSpecialization.ALTA:
            base_attrs.insert(0, f"spec:{spec_enum.name}")

        marker_attrs: list[str] = []
        if pair["consent"] == "granted":
            granted = _out_of_spec_markers(spec_enum, rng, 2)
            marker_attrs = [f"marker:{m}" for m in granted]

        key_blob = abe.generate_user_key(msk, base_attrs + marker_attrs)
        session.add(ABEUserKeyORM(
            specialist_user_id=spec_uid, patient_user_id=patient_uid,
            key_blob=key_blob, marker_attributes=marker_attrs,
        ))

        conv = conversations.get((patient_uid, spec_uid))
        if conv is None:
            continue

        if pair["consent"] == "granted" and marker_attrs:
            granted = [a.split(":", 1)[1] for a in marker_attrs]
            ar = AccessRequestORM(
                conversation_id=conv.id, specialist_user_id=spec_uid, patient_user_id=patient_uid,
                requested_markers=granted, approved_markers=granted,
                justification="Solicit acces pentru o evaluare completă a stării pacientului.",
                status=AccessRequestStatus.APPROVED, responded_at=datetime.now(timezone.utc),
            )
            session.add(ar)
            await session.flush()
            session.add(MessageORM(
                conversation_id=conv.id, sender_id=spec_uid, message_kind=MessageKind.ACCESS_REQUEST,
                message_text="Solicit acces pentru o evaluare completă a stării pacientului.",
                payload={"request_id": str(ar.id), "requested_markers": granted}, is_read=True,
            ))
            session.add(MessageORM(
                conversation_id=conv.id, sender_id=patient_uid, message_kind=MessageKind.ACCESS_RESPONSE,
                message_text="", payload={"request_id": str(ar.id), "approved_markers": granted},
                is_read=False,
            ))
        elif pair["consent"] == "pending":
            requested = _out_of_spec_markers(spec_enum, rng, 2)
            ar = AccessRequestORM(
                conversation_id=conv.id, specialist_user_id=spec_uid, patient_user_id=patient_uid,
                requested_markers=requested, justification="Aș avea nevoie de acces la acești markeri pentru context.",
                status=AccessRequestStatus.PENDING,
            )
            session.add(ar)
            await session.flush()
            session.add(MessageORM(
                conversation_id=conv.id, sender_id=spec_uid, message_kind=MessageKind.ACCESS_REQUEST,
                message_text="Aș avea nevoie de acces la acești markeri pentru context.",
                payload={"request_id": str(ar.id), "requested_markers": requested}, is_read=False,
            ))
    await session.flush()


async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed HealthMonitor demo data.")
    parser.add_argument("--reset", action="store_true", help="Wipe demo tables before seeding.")
    args = parser.parse_args()

    # The shared engine is created with echo=settings.debug; turn it off here so
    # the seed's own progress output stays readable regardless of DEBUG.
    engine.echo = False
    logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)

    rng = Random(RANDOM_SEED)
    settings = get_settings()

    print("Loading ABE authority and ML models...")
    abe = ConcreteABEAuthority.from_paths(
        Path(settings.abe_public_key_path), Path(settings.abe_secret_key_path),
    )
    ml_models = load_all_models(settings.ml_models_dir)

    async with async_session_maker() as session:
        if args.reset:
            print("Resetting demo tables...")
            await reset(session)
        elif await already_seeded(session):
            print("Database already seeded (admin user exists). Use --reset to rebuild. Skipping.")
            return

        print("Seeding users and profiles...")
        admin, specialists, patients = await seed_users(session, rng)

        print("Seeding relations...")
        approved = await seed_relations(session, patients, specialists)

        print("Seeding chat conversations, messages and plans...")
        conversations = await seed_chat(session, approved)

        print("Seeding medical records and ML predictions (this runs real inference)...")
        await seed_records(session, patients, ml_models, abe, conversations, rng)

        print("Seeding ABE keys and consent...")
        await seed_abe(session, approved, abe, conversations, rng)

        await session.commit()

    print(
        f"Done. {len(PATIENTS)} patients, {len(SPECIALISTS)} specialists, 1 admin, "
        f"{len(approved)} approved relations. Shared password: {PASSWORD}"
    )


if __name__ == "__main__":
    asyncio.run(main())
