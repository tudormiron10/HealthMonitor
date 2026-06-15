"""Medical record business logic."""

import base64
import json
import re
from uuid import UUID

from api.routes.schemas.record_schemas import MedicalRecordCreate
from core.constants import MARKER_TO_SPECIALIZATIONS
from core.exceptions import DecryptionFailedError
from domain.ports.abe_port import ABEAuthority
from domain.ports.record_repository import RecordRepository
from infrastructure.persistence.models.enums import RecordSource

_ATTR_RE = re.compile(r'[A-Za-z][A-Za-z0-9_:\-]*')


class RecordService:
    """Service handling medical record ingestions and retrievals."""

    def __init__(self, record_repo: RecordRepository, abe_authority: ABEAuthority | None = None):
        self.record_repo = record_repo
        self._abe = abe_authority

    def _build_policy(self, marker_key: str, patient_user_id: UUID) -> str:
        """Return the ABE access policy string for a single marker."""
        specs = MARKER_TO_SPECIALIZATIONS.get(marker_key, [])
        patient_clause = f"patient:{patient_user_id}"
        if not specs:
            return patient_clause
        spec_parts = " OR ".join(f"spec:{s.name}" for s in specs)
        return f"({spec_parts} OR marker:{marker_key}) AND {patient_clause}"

    def _encrypt_markers(self, markers_dict: dict, patient_user_id: UUID) -> dict:
        """Encrypt each marker value under its per-specialisation ABE policy."""
        encrypted: dict[str, str] = {}
        mpk = self._abe.master_public_key
        for key, value in markers_dict.items():
            policy = self._build_policy(key, patient_user_id)
            plaintext = json.dumps(value).encode("utf-8")
            ciphertext = self._abe.encrypt(mpk, plaintext, policy)
            encrypted[key] = base64.b64encode(ciphertext).decode("ascii")
        return encrypted

    async def add_manual_entry(
        self,
        patient_id: UUID,
        record_in: MedicalRecordCreate,
        patient_user_id: UUID | None = None,
    ) -> dict:
        """Persist a manually entered (or PDF-reviewed) medical record."""
        markers_dict = record_in.markers.model_dump(exclude_none=True)
        record_source = RecordSource.PDF_PARSED if record_in.document_url else RecordSource.MANUAL_ENTRY

        if self._abe and patient_user_id and markers_dict:
            encrypted = self._encrypt_markers(markers_dict, patient_user_id)
            record_data = {
                "patient_id": patient_id,
                "record_date": record_in.record_date,
                "source": record_source,
                "document_url": record_in.document_url,
                "raw_markers": None,
                "raw_markers_encrypted": encrypted,
                "is_encrypted": True,
            }
        else:
            record_data = {
                "patient_id": patient_id,
                "record_date": record_in.record_date,
                "source": record_source,
                "document_url": record_in.document_url,
                "raw_markers": markers_dict,
            }

        return await self.record_repo.save(record_data)

    async def get_patient_records(self, patient_id: UUID) -> list[dict]:
        """Retrieve all medical records for a specific patient."""
        return await self.record_repo.find_by_patient_id(patient_id)

    def _owner_decrypt_ciphertext(self, b64_ct: str) -> tuple[object, str]:
        """Decrypt a single base64-encoded ciphertext as the data owner.

        Returns (value, "DECRYPTED") on success or (None, "LOCKED") on failure.
        """
        try:
            ct_bytes = base64.b64decode(b64_ct)
            envelope = json.loads(ct_bytes.decode("utf-8"))
            policy = envelope.get("policy", "")
            attributes = [
                t for t in _ATTR_RE.findall(policy) if t not in ("AND", "OR")
            ]
            owner_key = self._abe.generate_user_key(self._abe.master_secret_key, attributes)
            plaintext = self._abe.decrypt(owner_key, ct_bytes)
            return json.loads(plaintext.decode("utf-8")), "DECRYPTED"
        except Exception:
            return None, "LOCKED"

    def decrypt_as_owner(self, record: dict) -> dict:
        """Return record with all encrypted markers decrypted using the master secret."""
        markers = record.get("raw_markers") or {}
        if not record.get("is_encrypted"):
            return {**record, "markers_access": {k: "DECRYPTED" for k in markers}}

        encrypted = record.get("raw_markers_encrypted") or {}

        if not self._abe:
            return {
                **record,
                "raw_markers": {},
                "markers_access": {k: "LOCKED" for k in encrypted},
            }

        decrypted: dict = {}
        access: dict = {}
        for key, b64_ct in encrypted.items():
            value, status = self._owner_decrypt_ciphertext(b64_ct)
            access[key] = status
            if status == "DECRYPTED":
                decrypted[key] = value
        return {**record, "raw_markers": decrypted, "markers_access": access}

    def decrypt_as_specialist(self, record: dict, key_blob: bytes | None) -> dict:
        """Return record with markers decrypted per the specialist's ABE key."""
        markers = record.get("raw_markers") or {}
        if not record.get("is_encrypted"):
            return {**record, "markers_access": {k: "DECRYPTED" for k in markers}}

        encrypted = record.get("raw_markers_encrypted") or {}

        if not self._abe or key_blob is None:
            return {
                **record,
                "raw_markers": {},
                "markers_access": {k: "LOCKED" for k in encrypted},
            }

        decrypted: dict = {}
        access: dict = {}
        for key, b64_ct in encrypted.items():
            try:
                ct_bytes = base64.b64decode(b64_ct)
                plaintext = self._abe.decrypt(key_blob, ct_bytes)
                decrypted[key] = json.loads(plaintext.decode("utf-8"))
                access[key] = "DECRYPTED"
            except DecryptionFailedError:
                access[key] = "LOCKED"
        return {**record, "raw_markers": decrypted, "markers_access": access}

    async def add_pdf_upload(
        self,
        patient_id: UUID,
        record_date,
        document_url: str,
        raw_markers: dict | None = None,
        patient_user_id: UUID | None = None,
    ) -> dict:
        """Create a medical record entry from an uploaded PDF."""
        if self._abe and patient_user_id and raw_markers:
            encrypted = self._encrypt_markers(raw_markers, patient_user_id)
            record_data = {
                "patient_id": patient_id,
                "record_date": record_date,
                "source": RecordSource.PDF_PARSED,
                "document_url": document_url,
                "raw_markers": None,
                "raw_markers_encrypted": encrypted,
                "is_encrypted": True,
            }
        else:
            record_data = {
                "patient_id": patient_id,
                "record_date": record_date,
                "source": RecordSource.PDF_PARSED,
                "document_url": document_url,
                "raw_markers": raw_markers,
            }

        return await self.record_repo.save(record_data)
