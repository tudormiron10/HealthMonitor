"""Pydantic schemas for Medical Records (Ingestion & Extraction)."""

import uuid
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

from infrastructure.persistence.models.enums import RecordSource


class MedicalMarkers(BaseModel):
    """The 26 standard clinical markers required by the ML Engine."""

    # Demographics & Anthropometrics
    sex: Optional[int] = Field(None, ge=1, le=2, description="1=Male, 2=Female")
    age: Optional[float] = Field(None, ge=18, le=120, description="Age in years")
    bmi: Optional[float] = Field(None, ge=10, le=70, description="Body Mass Index")
    waist_circumference: Optional[float] = Field(None, ge=40, le=200, description="In cm")
    smoker_status: Optional[int] = Field(None, ge=0, le=1, description="0=No, 1=Yes")

    # Vitals
    systolic_bp: Optional[float] = Field(None, ge=70, le=250, description="Systolic Blood Pressure (mmHg)")
    diastolic_bp: Optional[float] = Field(None, ge=40, le=150, description="Diastolic Blood Pressure (mmHg)")

    # Glycemic
    hba1c: Optional[float] = Field(None, ge=3.0, le=20.0, description="Glycated Hemoglobin (%)")
    fasting_glucose: Optional[float] = Field(None, ge=30, le=800, description="Fasting Glucose (mg/dL)")

    # Lipids
    total_cholesterol: Optional[float] = Field(None, ge=50, le=600, description="Total Cholesterol (mg/dL)")
    hdl: Optional[float] = Field(None, ge=10, le=150, description="HDL Cholesterol (mg/dL)")
    ldl: Optional[float] = Field(None, ge=10, le=400, description="LDL Cholesterol (mg/dL)")
    triglycerides: Optional[float] = Field(None, ge=20, le=2000, description="Triglycerides (mg/dL)")

    # Liver & Inflammation
    alt: Optional[float] = Field(None, ge=1, le=1000, description="Alanine Aminotransferase (U/L)")
    ast: Optional[float] = Field(None, ge=1, le=1000, description="Aspartate Aminotransferase (U/L)")
    ggt: Optional[float] = Field(None, ge=1, le=1500, description="Gamma-Glutamyl Transferase (U/L)")
    crp: Optional[float] = Field(None, ge=0, le=300, description="C-Reactive Protein (mg/L)")

    # Renal
    creatinine: Optional[float] = Field(None, ge=0.1, le=20.0, description="Serum Creatinine (mg/dL)")
    urea: Optional[float] = Field(None, ge=5, le=300, description="Blood Urea Nitrogen or Urea (mg/dL)")
    uacr: Optional[float] = Field(None, ge=0, le=5000, description="Urine Albumin-to-Creatinine Ratio (mg/g)")
    uric_acid: Optional[float] = Field(None, ge=1.0, le=20.0, description="Uric Acid (mg/dL)")

    # Hematology & Nutrition
    hemoglobin: Optional[float] = Field(None, ge=4.0, le=25.0, description="Hemoglobin (g/dL)")
    mcv: Optional[float] = Field(None, ge=50, le=150, description="Mean Corpuscular Volume (fL)")
    ferritin: Optional[float] = Field(None, ge=1.0, le=3000, description="Ferritin (ng/mL)")
    vitamin_d: Optional[float] = Field(None, ge=2.0, le=200, description="Vitamin D 25-OH (ng/mL)")
    folate: Optional[float] = Field(None, ge=1.0, le=100, description="Folate (ng/mL)")


class MedicalRecordCreate(BaseModel):
    """Payload for creating a manual medical record entry."""
    record_date: date
    markers: MedicalMarkers
    document_url: Optional[str] = None

    @model_validator(mode='after')
    def require_minimum_markers(self) -> 'MedicalRecordCreate':
        if self.markers.sex is None or self.markers.age is None:
            raise ValueError("Age and sex are required minimum fields for ML predictions.")
        return self


class MedicalRecordRead(BaseModel):
    """Response payload representing a saved medical record."""
    id: uuid.UUID
    patient_id: uuid.UUID
    record_date: date
    created_at: datetime
    source: RecordSource
    document_url: Optional[str] = None
    raw_markers: Optional[MedicalMarkers] = None
    markers_access: Optional[dict[str, Literal["DECRYPTED", "LOCKED"]]] = None

    class Config:
        from_attributes = True
