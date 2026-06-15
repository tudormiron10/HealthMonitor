"""Port for persisting uploaded documents (lab PDFs, verification documents)."""

from abc import ABC, abstractmethod
from uuid import UUID


class FileStorage(ABC):
    """Contract for storing uploaded files and returning their retrievable path."""

    @abstractmethod
    async def save_pdf(self, patient_id: UUID, file_content: bytes, original_filename: str) -> str:
        """Persist a lab-report PDF and return its relative path."""

    @abstractmethod
    async def save_verification_document(self, user_id: UUID, file_content: bytes, original_filename: str) -> str:
        """Persist a specialist verification document and return its relative path."""
