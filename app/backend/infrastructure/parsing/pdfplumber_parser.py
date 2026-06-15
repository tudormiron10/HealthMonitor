"""pdfplumber-based adapter for extracting medical markers from PDF lab reports."""

import logging
import re
from pathlib import Path

import pdfplumber # type: ignore

from api.routes.schemas.record_schemas import MedicalMarkers
from domain.ports.pdf_parser_port import PdfParser

logger = logging.getLogger(__name__)

MARKER_PATTERNS = {
    "fasting_glucose": r"(?:glucoz[aă]\s*seric[aă]|glicemie).*?(?P<val>\d+(?:\.\d+)?)\s*mg/dl",
    "total_cholesterol": r"colesterol\s*seric\s*total.*?(?P<val>\d+(?:\.\d+)?)\s*mg/dl",
    "triglycerides": r"trigliceride(?:.*?serice)?\s+(?P<val>\d+(?:\.\d+)?)\s*mg/dl",
    "hdl": r"hdl\s*colesterol.*?(?P<val>\d+(?:\.\d+)?)\s*mg/dl",
    "ldl": r"ldl\s*colesterol.*?(?P<val>\d+(?:\.\d+)?)\s*mg/dl",
    "ast": r"(?:tgo\s*/\s*ast|ast/tgo|ast\s*\(tgo\)).*?(?P<val>\d+(?:\.\d+)?)\s*[u/l|ui/l]",
    "alt": r"(?:tgp\s*/\s*alt|alt/tgp|alt\s*\(tgp\)).*?(?P<val>\d+(?:\.\d+)?)\s*[u/l|ui/l]",
    "ggt": r"(?:gamma\s*glutamil\s*transferaza|ggt|gamma\s*gt).*?(?P<val>\d+(?:\.\d+)?)\s*[u/l|ui/l]",
    "crp": r"(?:proteina\s*c\s*reactiva|crp).*?(?P<val>\d+(?:\.\d+)?)\s*mg/[dl|l]",
    "creatinine": r"creatinin[aă]\s*seric[aă].*?(?P<val>\d+(?:\.\d+)?)\s*mg/dl",
    "urea": r"uree\s*seric[aă].*?(?P<val>\d+(?:\.\d+)?)\s*mg/dl",
    "uacr": r"raport\s*microalbuminurie/creatinina.*?(?P<val>\d+(?:\.\d+)?)\s*mg/g",
    "uric_acid": r"acid\s*uric\s*seric.*?(?P<val>\d+(?:\.\d+)?)\s*mg/dl",
    "hba1c": r"hemoglobin[aă]\s*glicozilat[aă].*?hba1c.*?(?P<val>\d+(?:\.\d+)?)\s*%",
    "hemoglobin": r"hemoglobin[aă]\s*\(hgb\).*?(?P<val>\d+(?:\.\d+)?)\s*g/dl",
    "mcv": r"volum\s*mediu\s*eritrocitar\s*\(mcv\).*?(?P<val>\d+(?:\.\d+)?)",
    "ferritin": r"feritin[aă].*?(?P<val>\d+(?:\.\d+)?)\s*ng/ml",
    "vitamin_d": r"vitamina\s*d.*?(?P<val>\d+(?:\.\d+)?)\s*ng/ml",
    "folate": r"folat.*?(?P<val>\d+(?:\.\d+)?)\s*ng/ml",
}


class PdfPlumberParser(PdfParser):
    """Extracts text from PDFs via pdfplumber and maps values to MedicalMarkers."""

    def extract_text(self, file_path: str | Path) -> str:
        """Extract all raw text from a PDF document."""
        text_content = []
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(page_text)

            return "\n".join(text_content)
        except Exception as e:
            logger.error("Failed to extract text from PDF: %s", e)
            return ""

    def parse_markers(self, raw_text: str) -> MedicalMarkers:
        """Parse raw text and return a MedicalMarkers Pydantic model."""
        extracted_data = {}

        normalized_text = raw_text.lower()

        for field_name, pattern in MARKER_PATTERNS.items():
            match = re.search(pattern, normalized_text)
            if match:
                try:
                    val = float(match.group("val"))
                    extracted_data[field_name] = val
                    logger.debug("Found %s: %s", field_name, val)
                except ValueError:
                    logger.warning("Could not convert %s to float for %s", match.group("val"), field_name)

        return MedicalMarkers(**extracted_data)

    def process_pdf(self, file_path: str | Path) -> MedicalMarkers:
        """End-to-end processing of a PDF file to extract markers."""
        raw_text = self.extract_text(file_path)
        if not raw_text.strip():
            logger.warning("No text could be extracted from the PDF at %s.", file_path)
            return MedicalMarkers()

        return self.parse_markers(raw_text)
