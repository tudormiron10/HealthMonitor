"""relations_and_specialization

Revision ID: 3f8e2a1c9b05
Revises: ad2525250faf
Create Date: 2026-05-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '3f8e2a1c9b05'
down_revision: Union[str, None] = 'ad2525250faf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # RENAME VALUE requires PostgreSQL 10+; ADD VALUE inside a transaction requires PostgreSQL 12+
    op.execute("ALTER TYPE relationstatus RENAME VALUE 'ACTIVE' TO 'APPROVED'")
    op.execute("ALTER TYPE relationstatus ADD VALUE 'REJECTED'")

    op.execute("""
        CREATE TYPE medicalspecialization AS ENUM (
            'Cardiologie',
            'Endocrinologie',
            'Diabet, Nutriție și Boli Metabolice',
            'Gastroenterologie',
            'Hepatologie',
            'Nefrologie',
            'Hematologie',
            'Medicină Internă',
            'Urologie',
            'Nutriționist',
            'Antrenor Personal',
            'Altă Specializare'
        )
    """)

    op.add_column(
        'patient_specialist_relations',
        sa.Column(
            'initiated_by',
            sa.Enum(
                'ADMIN', 'PATIENT', 'DOCTOR', 'NUTRITIONIST', 'COACH',
                name='userrole',
                create_type=False,
            ),
            nullable=False,
            server_default='PATIENT',
        ),
    )
    op.execute(
        "ALTER TABLE patient_specialist_relations "
        "ALTER COLUMN initiated_by DROP DEFAULT"
    )

    op.execute("""
        ALTER TABLE specialist_profiles
        ALTER COLUMN specialization TYPE medicalspecialization
        USING (
            CASE specialization
                WHEN 'Cardiologie'
                    THEN 'Cardiologie'::medicalspecialization
                WHEN 'Endocrinologie'
                    THEN 'Endocrinologie'::medicalspecialization
                WHEN 'Diabet, Nutriție și Boli Metabolice'
                    THEN 'Diabet, Nutriție și Boli Metabolice'::medicalspecialization
                WHEN 'Gastroenterologie'
                    THEN 'Gastroenterologie'::medicalspecialization
                WHEN 'Hepatologie'
                    THEN 'Hepatologie'::medicalspecialization
                WHEN 'Nefrologie'
                    THEN 'Nefrologie'::medicalspecialization
                WHEN 'Hematologie'
                    THEN 'Hematologie'::medicalspecialization
                WHEN 'Medicină Internă'
                    THEN 'Medicină Internă'::medicalspecialization
                WHEN 'Urologie'
                    THEN 'Urologie'::medicalspecialization
                WHEN 'Nutriționist'
                    THEN 'Nutriționist'::medicalspecialization
                WHEN 'Antrenor Personal'
                    THEN 'Antrenor Personal'::medicalspecialization
                ELSE 'Altă Specializare'::medicalspecialization
            END
        )
    """)
    op.alter_column('specialist_profiles', 'specialization', nullable=True)

    op.create_index(
        'uq_active_relation',
        'patient_specialist_relations',
        ['patient_id', 'specialist_id'],
        unique=True,
        postgresql_where=sa.text("status IN ('PENDING', 'APPROVED')"),
    )


def downgrade() -> None:
    op.drop_index('uq_active_relation', table_name='patient_specialist_relations')

    op.execute(
        "UPDATE specialist_profiles "
        "SET specialization = 'Altă Specializare' "
        "WHERE specialization IS NULL"
    )
    op.execute("""
        ALTER TABLE specialist_profiles
        ALTER COLUMN specialization TYPE VARCHAR(100)
        USING specialization::text
    """)
    op.alter_column('specialist_profiles', 'specialization', nullable=False)

    op.execute("DROP TYPE medicalspecialization")

    op.drop_column('patient_specialist_relations', 'initiated_by')

    # PostgreSQL cannot drop individual enum values; recreate the type from scratch.
    # REJECTED rows become REVOKED — downgrade is intentionally lossy.
    op.execute(
        "UPDATE patient_specialist_relations "
        "SET status = 'REVOKED' "
        "WHERE status = 'REJECTED'"
    )
    op.execute(
        "CREATE TYPE relationstatus_v1 AS ENUM ('PENDING', 'ACTIVE', 'REVOKED')"
    )
    op.execute("""
        ALTER TABLE patient_specialist_relations
        ALTER COLUMN status TYPE relationstatus_v1
        USING (
            CASE status::text
                WHEN 'APPROVED' THEN 'ACTIVE'::relationstatus_v1
                WHEN 'PENDING'  THEN 'PENDING'::relationstatus_v1
                WHEN 'REVOKED'  THEN 'REVOKED'::relationstatus_v1
                ELSE 'PENDING'::relationstatus_v1
            END
        )
    """)
    op.execute("DROP TYPE relationstatus")
    op.execute("ALTER TYPE relationstatus_v1 RENAME TO relationstatus")
