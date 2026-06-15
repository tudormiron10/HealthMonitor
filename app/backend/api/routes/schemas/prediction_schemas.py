"""Pydantic schemas for ML Prediction endpoints."""

import uuid
from typing import Optional

from pydantic import BaseModel, Field


class ModelAResult(BaseModel):
    """Model A (diagnostic-marker-inclusive) result for a single condition."""
    probability: float
    predicted_class: int
    label: str


class ConditionPrediction(BaseModel):
    """Result for a single medical condition."""
    probability: Optional[float] = Field(None, description="Risk probability (0.0 to 1.0)")
    predicted_class: Optional[int] = Field(None, description="Predicted class code")
    label: Optional[str] = Field(None, description="Human-readable class label")
    error: Optional[str] = Field(None, description="Error message if prediction failed")
    decisive_marker_present: bool = False
    model_a: Optional[ModelAResult] = None


class PredictionRunResponse(BaseModel):
    """Response payload after running all ML models on a medical record."""
    id: uuid.UUID
    medical_record_id: uuid.UUID
    model_version: str
    health_score: int = Field(ge=0, le=100, description="Aggregated health score (0=worst, 100=best)")
    metrics: dict[str, ConditionPrediction] = Field(
        description="Per-condition prediction results keyed by condition slug"
    )


class PredictionRead(BaseModel):
    """Response payload for reading a saved prediction from the database."""
    id: uuid.UUID
    medical_record_id: uuid.UUID
    model_version: str
    health_score: Optional[int] = None
    metrics: Optional[dict] = None

    class Config:
        from_attributes = True
