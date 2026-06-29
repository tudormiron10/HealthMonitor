"""SQLAlchemy ORM models — physical database tables.

These models live in the infrastructure layer because they depend
on SQLAlchemy; the domain layer (domain/ports/) stays persistence-agnostic.

Tables:
    - users: Central authentication
    - patient_profiles: Patient demographic data (ML-relevant)
    - specialist_profiles: Doctor/nutritionist/coach details
    - patient_specialist_relations: Links patients to specialists
    - medical_records: Per-visit analysis sets; raw_markers_encrypted holds ABE ciphertext
    - ml_predictions: ML model outputs per medical record
    - specialist_work_experience: Normalized work history entries per specialist
    - specialist_education: Normalized education entries per specialist
    - specialist_certifications: Normalized certification entries per specialist
    - conversations: One row per patient-specialist chat room (unique pair)
    - messages: Chat messages; sender_id is NULL for SYSTEM_RED_FLAG messages
    - abe_user_keys: Per-relation ABE user key; at most one active row per (specialist, patient)
    - access_requests: Specialist consent requests for out-of-domain marker access
    - user_plan_archives: Per-user soft-archive of plan messages; composite PK (user_id, message_id)
    - password_reset_tokens: Single-use password reset tokens; only the SHA-256 hash is stored
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ( # type: ignore
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    PrimaryKeyConstraint,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID # type: ignore
from sqlalchemy.orm import Mapped, mapped_column, relationship # type: ignore

from infrastructure.persistence.database import Base
from infrastructure.persistence.models.enums import (
    AccessRequestStatus,
    CertificationType,
    MedicalSpecialization,
    MedicGrade,
    MessageKind,
    RecordSource,
    RelationStatus,
    UserRole,
    VerificationStatus,
)


"""Identity Module"""

class UserORM(Base):
    """Central user account for authentication."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    verification_status: Mapped[Optional[VerificationStatus]] = mapped_column(
        Enum(VerificationStatus, create_type=False), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    # Relationships
    patient_profile: Mapped["PatientProfileORM"] = relationship(back_populates="user", uselist=False)
    specialist_profile: Mapped["SpecialistProfileORM"] = relationship(
        back_populates="user", uselist=False,
        foreign_keys="[SpecialistProfileORM.user_id]",
    )


class PatientProfileORM(Base):
    """Patient demographic data required by ML models."""

    __tablename__ = "patient_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        unique=True, nullable=False,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[str] = mapped_column(Date, nullable=False)
    sex: Mapped[int] = mapped_column(Integer, nullable=False)  # 1=Male, 2=Female

    # Relationships
    user: Mapped["UserORM"] = relationship(back_populates="patient_profile")
    medical_records: Mapped[list["MedicalRecordORM"]] = relationship(back_populates="patient")


class SpecialistProfileORM(Base):
    """Specialist details — doctors, nutritionists, coaches."""

    __tablename__ = "specialist_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        unique=True, nullable=False,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    # create_type=False: the enum type is managed by migrations, not auto-created by SQLAlchemy
    # values_callable: PostgreSQL enum stores .value ("Cardiologie"), not .name ("CARDIOLOGIE")
    specialization: Mapped[MedicalSpecialization] = mapped_column(
        Enum(MedicalSpecialization, create_type=False,
             values_callable=lambda obj: [e.value for e in obj]),
        nullable=True,
    )
    license_number: Mapped[str] = mapped_column(String(50), nullable=True)
    # DEPRECATED — kept for back-compat; new flows use specialist_work_experience rows
    clinic_affiliation: Mapped[str] = mapped_column(String(200), nullable=True)

    # Role-specific credential fields (Doctor)
    cod_parafa: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # DEPRECATED — kept for back-compat; new flows use specialist_work_experience rows
    unitate_sanitara: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Role-specific credential fields (Nutritionist)
    numar_ondr: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    institutie_absolvire: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Role-specific credential fields (Coach)
    tip_certificare: Mapped[Optional[CertificationType]] = mapped_column(
        Enum(CertificationType, create_type=False), nullable=True,
    )
    numar_certificare: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Verification workflow
    verification_document_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True,
    )

    # Extended profile fields (Epic 12)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    limbi_vorbite: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    website_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    program_lucru: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    grad_profesional: Mapped[Optional[MedicGrade]] = mapped_column(
        Enum(MedicGrade, create_type=False), nullable=True,
    )
    specializari_secundare: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    competente_atestate: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    specializare_nutritie: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    specializare_sportiva: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    filosofie_profesionala: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(),
    )

    # Relationships
    user: Mapped["UserORM"] = relationship(
        back_populates="specialist_profile",
        foreign_keys="[SpecialistProfileORM.user_id]",
    )
    work_experience: Mapped[list["SpecialistWorkExperienceORM"]] = relationship(
        back_populates="specialist_profile", cascade="all, delete-orphan",
    )
    education: Mapped[list["SpecialistEducationORM"]] = relationship(
        back_populates="specialist_profile", cascade="all, delete-orphan",
    )
    certifications: Mapped[list["SpecialistCertificationORM"]] = relationship(
        back_populates="specialist_profile", cascade="all, delete-orphan",
    )


class PatientSpecialistRelationORM(Base):
    """Association between a patient and a specialist."""

    __tablename__ = "patient_specialist_relations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    specialist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    status: Mapped[RelationStatus] = mapped_column(
        Enum(RelationStatus), default=RelationStatus.PENDING, nullable=False,
    )
    initiated_by: Mapped[UserRole] = mapped_column(
        Enum(UserRole, create_type=False), nullable=False,
    )


"""Medical Module"""

class MedicalRecordORM(Base):
    """A single set of lab results uploaded by a patient."""

    __tablename__ = "medical_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patient_profiles.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    record_date: Mapped[str] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    source: Mapped[RecordSource] = mapped_column(
        Enum(RecordSource), nullable=False,
    )
    document_url: Mapped[str] = mapped_column(Text, nullable=True)
    raw_markers: Mapped[dict] = mapped_column(JSONB, nullable=True)
    raw_markers_encrypted: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    is_encrypted: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), nullable=False,
    )

    # Relationships
    patient: Mapped["PatientProfileORM"] = relationship(back_populates="medical_records")
    predictions: Mapped[list["MLPredictionORM"]] = relationship(back_populates="medical_record")


class MLPredictionORM(Base):
    """ML model prediction results for a specific medical record."""

    __tablename__ = "ml_predictions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    medical_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medical_records.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    metrics: Mapped[dict] = mapped_column(JSONB, nullable=True)
    health_score: Mapped[int] = mapped_column(Integer, nullable=True)

    # Relationships
    medical_record: Mapped["MedicalRecordORM"] = relationship(back_populates="predictions")


"""Specialist Profile Module"""

class SpecialistWorkExperienceORM(Base):
    """Normalized work history entries for a specialist profile."""

    __tablename__ = "specialist_work_experience"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    specialist_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("specialist_profiles.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    employer: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    start_date: Mapped[str] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[str]] = mapped_column(Date, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )

    # Relationships
    specialist_profile: Mapped["SpecialistProfileORM"] = relationship(back_populates="work_experience")


class SpecialistEducationORM(Base):
    """Normalized education entries for a specialist profile."""

    __tablename__ = "specialist_education"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    specialist_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("specialist_profiles.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    institution: Mapped[str] = mapped_column(String(200), nullable=False)
    degree: Mapped[str] = mapped_column(String(200), nullable=False)
    field_of_study: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    year_completed: Mapped[int] = mapped_column(Integer, nullable=False)
    honors: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )

    # Relationships
    specialist_profile: Mapped["SpecialistProfileORM"] = relationship(back_populates="education")


class SpecialistCertificationORM(Base):
    """Normalized certification entries for a specialist profile."""

    __tablename__ = "specialist_certifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    specialist_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("specialist_profiles.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    issuing_body: Mapped[str] = mapped_column(String(200), nullable=False)
    certification_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    issue_date: Mapped[str] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[Optional[str]] = mapped_column(Date, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )

    # Relationships
    specialist_profile: Mapped["SpecialistProfileORM"] = relationship(back_populates="certifications")


"""Chat Module"""

class ConversationORM(Base):
    """One chat room per patient-specialist pair."""

    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint("patient_user_id", "specialist_user_id", name="uq_conversations_pair"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    patient_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    specialist_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )

    # Relationships
    messages: Mapped[list["MessageORM"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan",
    )


class MessageORM(Base):
    """A single chat message within a conversation."""

    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_conversation_sent_at", "conversation_id", "sent_at"),
        Index("ix_messages_conversation_is_read", "conversation_id", "is_read"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    sender_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    message_kind: Mapped[MessageKind] = mapped_column(
        Enum(MessageKind, create_type=False), nullable=False, default=MessageKind.TEXT,
    )
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    conversation: Mapped["ConversationORM"] = relationship(back_populates="messages")


"""ABE Module"""

class ABEUserKeyORM(Base):
    """Per-relation ABE user key issued when a relation is APPROVED.

    At most one active row (revoked_at IS NULL) per (specialist_user_id, patient_user_id)
    pair — enforced by the partial unique index uq_abe_user_keys_active_pair.
    """

    __tablename__ = "abe_user_keys"
    __table_args__ = (
        Index(
            "uq_abe_user_keys_active_pair",
            "specialist_user_id", "patient_user_id",
            unique=True,
            postgresql_where=text("revoked_at IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    specialist_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    patient_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    key_blob: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    marker_attributes: Mapped[list] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb"), nullable=False,
    )
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class AccessRequestORM(Base):
    """Consent request from a specialist for access to out-of-domain markers."""

    __tablename__ = "access_requests"
    __table_args__ = (
        Index("ix_access_requests_patient_status", "patient_user_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    specialist_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    patient_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    requested_markers: Mapped[list] = mapped_column(JSONB, nullable=False)
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[AccessRequestStatus] = mapped_column(
        Enum(AccessRequestStatus, create_type=False),
        default=AccessRequestStatus.PENDING, nullable=False,
    )
    approved_markers: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


"""Plans Module"""

class UserPlanArchiveORM(Base):
    """Per-user soft-archive of plan messages."""

    __tablename__ = "user_plan_archives"
    __table_args__ = (
        PrimaryKeyConstraint("user_id", "message_id"),
        Index("ix_user_plan_archives_user_id", "user_id"),
        Index("ix_user_plan_archives_message_id", "message_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False,
    )
    archived_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )


"""Auth Module"""

class PasswordResetTokenORM(Base):
    """Single-use password reset token; only the SHA-256 hash of the raw token is stored."""

    __tablename__ = "password_reset_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
