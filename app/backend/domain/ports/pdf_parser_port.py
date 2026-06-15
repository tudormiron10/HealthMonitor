"""Port for extracting medical markers from a PDF lab report."""

from abc import ABC, abstractmethod
from pathlib import Path

from api.routes.schemas.record_schemas import MedicalMarkers


class PdfParser(ABC):
    """Contract for turning a stored PDF into a MedicalMarkers model."""

    @abstractmethod
    def process_pdf(self, file_path: str | Path) -> MedicalMarkers:
        """Extract text from the PDF and map recognised values to MedicalMarkers."""
