"""Authentication and Registration schemas."""

import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, model_validator

from infrastructure.persistence.models.enums import CertificationType, MedicalSpecialization, UserRole
from api.routes.schemas.specialist_schemas import MEDICAL_SPECIALIZATIONS, NON_PHYSICIAN_SPECIALIZATIONS


class PatientRegistrationRequest(BaseModel):
    """Registration payload for a new patient account."""

    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    date_of_birth: datetime.date
    sex: int = Field(..., description="1=Male, 2=Female")


class SpecialistRegistrationRequest(BaseModel):
    """Registration payload for a specialist; role-specific credentials validated below."""

    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    role: UserRole = Field(..., description="DOCTOR, NUTRITIONIST, or COACH")
    specialization: MedicalSpecialization | None = None
    license_number: str | None = None
    clinic_affiliation: str | None = None
    cod_parafa: str | None = None
    unitate_sanitara: str | None = None
    numar_ondr: str | None = None
    institutie_absolvire: str | None = None
    tip_certificare: CertificationType | None = None
    numar_certificare: str | None = None

    @model_validator(mode='after')
    def validate_role_and_specialization(self) -> 'SpecialistRegistrationRequest':
        if self.role not in (UserRole.DOCTOR, UserRole.NUTRITIONIST, UserRole.COACH):
            raise ValueError("role must be DOCTOR, NUTRITIONIST, or COACH")

        if self.role == UserRole.DOCTOR:
            if self.specialization is None:
                raise ValueError("specialization is required for DOCTOR role")
            if self.specialization not in MEDICAL_SPECIALIZATIONS:
                raise ValueError(
                    "DOCTOR role cannot use a non-physician specialization"
                )
            if not self.cod_parafa or not self.unitate_sanitara:
                raise ValueError("cod_parafa and unitate_sanitara are required for DOCTOR role")

        if self.role == UserRole.NUTRITIONIST:
            if self.specialization is not None and self.specialization != MedicalSpecialization.NUTRITIONIST:
                raise ValueError(
                    "NUTRITIONIST role may only use the Nutriționist specialization"
                )
            if not self.institutie_absolvire:
                raise ValueError("institutie_absolvire is required for NUTRITIONIST role")

        if self.role == UserRole.COACH:
            if self.specialization is not None and self.specialization != MedicalSpecialization.COACH:
                raise ValueError(
                    "COACH role may only use the Antrenor Personal specialization"
                )
            if not self.tip_certificare or not self.numar_certificare:
                raise ValueError("tip_certificare and numar_certificare are required for COACH role")

        return self


class RegistrationResponse(BaseModel):
    """Response after registration; carries an access token when auto-login applies."""

    message: str
    user_id: str
    role: str
    access_token: Optional[str] = None
    token_type: Optional[str] = None
