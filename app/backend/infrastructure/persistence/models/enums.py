"""Database enumerations used across ORM models."""

import enum


class UserRole(str, enum.Enum):
    """Roles available in the platform."""

    ADMIN = "ADMIN"
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    NUTRITIONIST = "NUTRITIONIST"
    COACH = "COACH"


class RelationStatus(str, enum.Enum):
    """Status of a patient-specialist relationship."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REVOKED = "REVOKED"


class VerificationStatus(str, enum.Enum):
    """Verification state for specialist accounts pending admin review."""

    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class CertificationType(str, enum.Enum):
    """Personal trainer certification body types."""

    ANEFS = "ANEFS"
    NASM = "NASM"
    ACE = "ACE"
    ISSA = "ISSA"
    ALTELE = "ALTELE"


class MedicalSpecialization(str, enum.Enum):
    """Medical specialization options for specialist profiles."""

    CARDIOLOGIE = "Cardiologie"
    ENDOCRINOLOGIE = "Endocrinologie"
    DIABET_NUTRITIE_BOLI_METABOLICE = "Diabet, Nutriție și Boli Metabolice"
    GASTROENTEROLOGIE = "Gastroenterologie"
    HEPATOLOGIE = "Hepatologie"
    NEFROLOGIE = "Nefrologie"
    HEMATOLOGIE = "Hematologie"
    MEDICINA_INTERNA = "Medicină Internă"
    UROLOGIE = "Urologie"
    NUTRITIONIST = "Nutriționist"
    COACH = "Antrenor Personal"
    ALTA = "Altă Specializare"


class RecordSource(str, enum.Enum):
    """How a medical record was ingested."""

    MANUAL_ENTRY = "MANUAL_ENTRY"
    PDF_PARSED = "PDF_PARSED"


class MedicGrade(str, enum.Enum):
    """Professional grade for medical doctors."""

    REZIDENT = "REZIDENT"
    SPECIALIST = "SPECIALIST"
    PRIMAR = "PRIMAR"


class LanguageCode(str, enum.Enum):
    """Languages spoken by a specialist; values stored as JSONB arrays."""

    RO = "RO"
    EN = "EN"
    FR = "FR"
    DE = "DE"
    ES = "ES"
    IT = "IT"
    OTHER = "OTHER"


class NutritionSpecialization(str, enum.Enum):
    """Subspecialties for nutritionist specialists; stored as JSONB arrays."""

    CLINICA = "CLINICA"
    SPORTIVA = "SPORTIVA"
    PEDIATRICA = "PEDIATRICA"
    ONCOLOGICA = "ONCOLOGICA"
    SARCINA = "SARCINA"
    ALTELE = "ALTELE"


class SportSpecialization(str, enum.Enum):
    """Subspecialties for personal coach specialists; stored as JSONB arrays."""

    FITNESS_GENERAL = "FITNESS_GENERAL"
    CULTURISM = "CULTURISM"
    RECUPERARE = "RECUPERARE"
    NUTRITIE_SPORTIVA = "NUTRITIE_SPORTIVA"
    YOGA = "YOGA"
    PILATES = "PILATES"
    ATLETISM = "ATLETISM"
    ALTELE = "ALTELE"


class MessageKind(str, enum.Enum):
    """Kind of a chat message in a conversation."""

    TEXT = "TEXT"
    SYSTEM_RED_FLAG = "SYSTEM_RED_FLAG"
    ACCESS_REQUEST = "ACCESS_REQUEST"
    ACCESS_RESPONSE = "ACCESS_RESPONSE"
    MEAL_PLAN = "MEAL_PLAN"
    WORKOUT_PLAN = "WORKOUT_PLAN"


class AccessRequestStatus(str, enum.Enum):
    """Status of a specialist's consent request for additional markers."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"
