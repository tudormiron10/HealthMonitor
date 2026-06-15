"""Local-filesystem adapter for storing uploaded documents.

Saves uploaded files to the local filesystem, organized per owner for
easy retrieval and cleanup. Swappable for an S3-backed adapter behind the
same FileStorage port.
"""

import logging
import uuid
from datetime import date, datetime
from pathlib import Path

from core.config import get_settings
from domain.ports.file_storage_port import FileStorage

logger = logging.getLogger(__name__)


class LocalFileStorage(FileStorage):
    """Store uploaded files in a local directory, organized by owner ID."""

    def __init__(self):
        settings = get_settings()
        self.base_dir = Path(settings.upload_dir)
        self.max_size_bytes = settings.max_upload_size_mb * 1024 * 1024

    async def save_pdf(self, patient_id: uuid.UUID, file_content: bytes, original_filename: str) -> str:
        """Save a PDF file to disk and return its relative path."""
        patient_dir = self.base_dir / str(patient_id)
        patient_dir.mkdir(parents=True, exist_ok=True)

        unique_suffix = uuid.uuid4().hex[:8]
        today = date.today().isoformat()
        safe_filename = f"{today}_{unique_suffix}.pdf"

        file_path = patient_dir / safe_filename
        file_path.write_bytes(file_content)

        relative_path = str(file_path.as_posix())
        logger.info("Saved PDF for patient %s at %s", patient_id, relative_path)

        return relative_path

    async def save_verification_document(
        self, user_id: uuid.UUID, file_content: bytes, original_filename: str
    ) -> str:
        """Save a specialist verification document and return its relative path."""
        doc_dir = self.base_dir / "verification_documents" / str(user_id)
        doc_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{original_filename}"

        file_path = doc_dir / safe_filename
        file_path.write_bytes(file_content)

        relative_path = str(file_path.as_posix())
        logger.info("Saved verification document for user %s at %s", user_id, relative_path)

        return relative_path
