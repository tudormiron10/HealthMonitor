"""Admin Panel response and request schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from infrastructure.persistence.models.enums import (
    CertificationType,
    MedicalSpecialization,
    UserRole,
    VerificationStatus,
)


class PlatformStatsResponse(BaseModel):
    """Aggregate platform counters shown on the admin dashboard."""

    total_patients: int
    total_doctors: int
    total_nutritionists_coaches: int
    pending_verifications: int
    total_medical_records: int
    total_ml_predictions: int
    active_relations: int


class UserAdminRead(BaseModel):
    """A user row as listed in the admin user-management table."""

    id: UUID
    email: str
    role: UserRole
    is_active: bool
    verification_status: VerificationStatus | None = None
    created_at: datetime
    first_name: str = ""
    last_name: str = ""

    class Config:
        from_attributes = True


class SpecialistPendingRead(BaseModel):
    """A pending specialist with full credentials for the admin verification queue."""

    user_id: UUID
    email: str
    role: UserRole
    is_active: bool
    verification_status: VerificationStatus | None = None
    created_at: datetime
    first_name: str
    last_name: str
    specialization: MedicalSpecialization | None = None
    license_number: str | None = None
    clinic_affiliation: str | None = None
    cod_parafa: str | None = None
    unitate_sanitara: str | None = None
    numar_ondr: str | None = None
    institutie_absolvire: str | None = None
    tip_certificare: CertificationType | None = None
    numar_certificare: str | None = None
    verification_document_url: str | None = None

    class Config:
        from_attributes = True


class RejectRequest(BaseModel):
    """Payload for rejecting a specialist's verification, with a mandatory reason."""

    reason: str = Field(..., min_length=10)
