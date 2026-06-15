"""Specialist profile schemas."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

from infrastructure.persistence.models.enums import (
    CertificationType,
    LanguageCode,
    MedicalSpecialization,
    MedicGrade,
    NutritionSpecialization,
    SportSpecialization,
    VerificationStatus,
)

MEDICAL_SPECIALIZATIONS: frozenset[MedicalSpecialization] = frozenset({
    MedicalSpecialization.CARDIOLOGIE,
    MedicalSpecialization.ENDOCRINOLOGIE,
    MedicalSpecialization.DIABET_NUTRITIE_BOLI_METABOLICE,
    MedicalSpecialization.GASTROENTEROLOGIE,
    MedicalSpecialization.HEPATOLOGIE,
    MedicalSpecialization.NEFROLOGIE,
    MedicalSpecialization.HEMATOLOGIE,
    MedicalSpecialization.MEDICINA_INTERNA,
    MedicalSpecialization.UROLOGIE,
    MedicalSpecialization.ALTA,
})

NON_PHYSICIAN_SPECIALIZATIONS: frozenset[MedicalSpecialization] = frozenset({
    MedicalSpecialization.NUTRITIONIST,
    MedicalSpecialization.COACH,
})

class SpecialistProfileUpdate(BaseModel):
    """Partial update for a specialist's basic profile fields."""

    first_name: str | None = None
    last_name: str | None = None
    specialization: MedicalSpecialization | None = None
    license_number: str | None = None
    clinic_affiliation: str | None = None


class SpecialistDetailsUpdate(BaseModel):
    """Partial update for non-credential extended profile fields."""

    bio: str | None = Field(None, max_length=500)
    limbi_vorbite: list[LanguageCode] = Field(default_factory=list)
    website_url: HttpUrl | None = None
    program_lucru: str | None = None
    grad_profesional: MedicGrade | None = None
    specializari_secundare: list[MedicalSpecialization] = Field(default_factory=list)
    competente_atestate: list[str] = Field(default_factory=list)
    specializare_nutritie: list[NutritionSpecialization] = Field(default_factory=list)
    specializare_sportiva: list[SportSpecialization] = Field(default_factory=list)
    filosofie_profesionala: str | None = Field(None, max_length=300)

class WorkExperienceCreate(BaseModel):
    """Payload to add a work-experience entry."""

    title: str = Field(..., max_length=200)
    employer: str = Field(..., max_length=200)
    location: str | None = Field(None, max_length=200)
    start_date: date
    end_date: date | None = None
    description: str | None = Field(None, max_length=500)
    display_order: int = 0


class WorkExperienceUpdate(BaseModel):
    """Partial update for a work-experience entry."""

    title: str | None = Field(None, max_length=200)
    employer: str | None = Field(None, max_length=200)
    location: str | None = Field(None, max_length=200)
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = Field(None, max_length=500)
    display_order: int | None = None


class WorkExperienceRead(BaseModel):
    """A work-experience entry as returned to clients."""

    id: UUID
    specialist_profile_id: UUID
    title: str
    employer: str
    location: str | None = None
    start_date: date
    end_date: date | None = None
    description: str | None = None
    display_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EducationCreate(BaseModel):
    """Payload to add an education entry."""

    institution: str = Field(..., max_length=200)
    degree: str = Field(..., max_length=200)
    field_of_study: str | None = Field(None, max_length=200)
    year_completed: int
    honors: str | None = Field(None, max_length=200)
    display_order: int = 0


class EducationUpdate(BaseModel):
    """Partial update for an education entry."""

    institution: str | None = Field(None, max_length=200)
    degree: str | None = Field(None, max_length=200)
    field_of_study: str | None = Field(None, max_length=200)
    year_completed: int | None = None
    honors: str | None = Field(None, max_length=200)
    display_order: int | None = None


class EducationRead(BaseModel):
    """An education entry as returned to clients."""

    id: UUID
    specialist_profile_id: UUID
    institution: str
    degree: str
    field_of_study: str | None = None
    year_completed: int
    honors: str | None = None
    display_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CertificationCreate(BaseModel):
    """Payload to add a certification entry."""

    name: str = Field(..., max_length=200)
    issuing_body: str = Field(..., max_length=200)
    certification_number: str | None = Field(None, max_length=100)
    issue_date: date
    expiry_date: date | None = None
    display_order: int = 0


class CertificationUpdate(BaseModel):
    """Partial update for a certification entry."""

    name: str | None = Field(None, max_length=200)
    issuing_body: str | None = Field(None, max_length=200)
    certification_number: str | None = Field(None, max_length=100)
    issue_date: date | None = None
    expiry_date: date | None = None
    display_order: int | None = None


class CertificationRead(BaseModel):
    """A certification entry as returned to clients."""

    id: UUID
    specialist_profile_id: UUID
    name: str
    issuing_body: str
    certification_number: str | None = None
    issue_date: date
    expiry_date: date | None = None
    display_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SpecialistProfileRead(BaseModel):
    """Full specialist profile: credentials, verification state, and extended fields."""

    id: UUID
    user_id: UUID
    first_name: str
    last_name: str
    specialization: MedicalSpecialization | None = None
    license_number: str | None = None
    clinic_affiliation: str | None = None
    verification_status: VerificationStatus | None = None
    rejection_reason: str | None = None
    cod_parafa: str | None = None
    unitate_sanitara: str | None = None
    numar_ondr: str | None = None
    institutie_absolvire: str | None = None
    tip_certificare: CertificationType | None = None
    numar_certificare: str | None = None
    verification_document_url: str | None = None
    verified_at: datetime | None = None
    verified_by_admin_id: UUID | None = None
    # Extended fields (Epic 12)
    photo_url: str | None = None
    bio: str | None = None
    limbi_vorbite: list[str] = Field(default_factory=list)
    website_url: str | None = None
    program_lucru: str | None = None
    grad_profesional: MedicGrade | None = None
    specializari_secundare: list[str] = Field(default_factory=list)
    competente_atestate: list[str] = Field(default_factory=list)
    specializare_nutritie: list[str] = Field(default_factory=list)
    specializare_sportiva: list[str] = Field(default_factory=list)
    filosofie_profesionala: str | None = None
    updated_at: datetime | None = None
    headline: str = ""

    class Config:
        from_attributes = True


class SpecialistProfileFullRead(SpecialistProfileRead):
    """Full specialist profile including sub-entities and computed headline."""

    work_experience: list[WorkExperienceRead] = Field(default_factory=list)
    education: list[EducationRead] = Field(default_factory=list)
    certifications: list[CertificationRead] = Field(default_factory=list)


class PublicSpecialistProfileRead(BaseModel):
    """Public-facing profile — omits all internal verification and admin fields."""

    id: UUID
    user_id: UUID
    first_name: str
    last_name: str
    specialization: MedicalSpecialization | None = None
    license_number: str | None = None
    clinic_affiliation: str | None = None
    verification_status: VerificationStatus | None = None
    cod_parafa: str | None = None
    unitate_sanitara: str | None = None
    numar_ondr: str | None = None
    institutie_absolvire: str | None = None
    tip_certificare: CertificationType | None = None
    numar_certificare: str | None = None
    photo_url: str | None = None
    bio: str | None = None
    limbi_vorbite: list[str] = Field(default_factory=list)
    website_url: str | None = None
    program_lucru: str | None = None
    grad_profesional: MedicGrade | None = None
    specializari_secundare: list[str] = Field(default_factory=list)
    competente_atestate: list[str] = Field(default_factory=list)
    specializare_nutritie: list[str] = Field(default_factory=list)
    specializare_sportiva: list[str] = Field(default_factory=list)
    filosofie_profesionala: str | None = None
    updated_at: datetime | None = None
    work_experience: list[WorkExperienceRead] = Field(default_factory=list)
    education: list[EducationRead] = Field(default_factory=list)
    certifications: list[CertificationRead] = Field(default_factory=list)
    headline: str = ""

    class Config:
        from_attributes = True


class PhotoUploadResponse(BaseModel):
    """Response with the stored profile-photo URL."""

    photo_url: str


class PatientCardRead(BaseModel):
    """Summary card for a patient as seen by their specialist."""

    user_id: UUID
    first_name: str
    last_name: str
    sex: int
    date_of_birth: date
    health_score: int | None = None
    last_update: date | None = None
    uploaded_at: datetime | None = None
    red_flags: list[str] = []
