"""Schemas for the PDF upload-and-parse flow."""

import uuid
from typing import Optional

from pydantic import BaseModel

from api.routes.schemas.record_schemas import MedicalMarkers


class ParsedPDFResponse(BaseModel):
    """Response returned after parsing a PDF."""
    document_url: str
    extracted_markers: MedicalMarkers
