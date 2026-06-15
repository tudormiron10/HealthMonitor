"""admin_verification_schema

Revision ID: a1b2c3d4e5f6
Revises: 7c4d3e8f2a01
Create Date: 2026-05-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '7c4d3e8f2a01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TYPE verificationstatus AS ENUM (
            'PENDING_VERIFICATION',
            'APPROVED',
            'REJECTED'
        )
    """)
    op.execute("""
        CREATE TYPE certificationtype AS ENUM (
            'ANEFS',
            'NASM',
            'ACE',
            'ISSA',
            'ALTELE'
        )
    """)

    op.add_column(
        'users',
        sa.Column(
            'verification_status',
            sa.Enum(
                'PENDING_VERIFICATION', 'APPROVED', 'REJECTED',
                name='verificationstatus',
                create_type=False,
            ),
            nullable=True,
        ),
    )
    op.add_column(
        'users',
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('NOW()'),
            nullable=False,
        ),
    )

    op.add_column('specialist_profiles', sa.Column('cod_parafa', sa.String(20), nullable=True))
    op.add_column('specialist_profiles', sa.Column('unitate_sanitara', sa.String(200), nullable=True))
    op.add_column('specialist_profiles', sa.Column('numar_ondr', sa.String(50), nullable=True))
    op.add_column('specialist_profiles', sa.Column('institutie_absolvire', sa.String(200), nullable=True))
    op.add_column(
        'specialist_profiles',
        sa.Column(
            'tip_certificare',
            sa.Enum(
                'ANEFS', 'NASM', 'ACE', 'ISSA', 'ALTELE',
                name='certificationtype',
                create_type=False,
            ),
            nullable=True,
        ),
    )
    op.add_column('specialist_profiles', sa.Column('numar_certificare', sa.String(100), nullable=True))
    op.add_column('specialist_profiles', sa.Column('verification_document_url', sa.Text(), nullable=True))
    op.add_column('specialist_profiles', sa.Column('rejection_reason', sa.Text(), nullable=True))
    op.add_column('specialist_profiles', sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        'specialist_profiles',
        sa.Column('verified_by_admin_id', UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'fk_specialist_profiles_verified_by_admin_id',
        'specialist_profiles',
        'users',
        ['verified_by_admin_id'],
        ['id'],
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_specialist_profiles_verified_by_admin_id',
        'specialist_profiles',
        type_='foreignkey',
    )
    op.drop_column('specialist_profiles', 'verified_by_admin_id')
    op.drop_column('specialist_profiles', 'verified_at')
    op.drop_column('specialist_profiles', 'rejection_reason')
    op.drop_column('specialist_profiles', 'verification_document_url')
    op.drop_column('specialist_profiles', 'numar_certificare')
    op.drop_column('specialist_profiles', 'tip_certificare')
    op.drop_column('specialist_profiles', 'institutie_absolvire')
    op.drop_column('specialist_profiles', 'numar_ondr')
    op.drop_column('specialist_profiles', 'unitate_sanitara')
    op.drop_column('specialist_profiles', 'cod_parafa')
    op.drop_column('users', 'created_at')
    op.drop_column('users', 'verification_status')
    op.execute("DROP TYPE certificationtype")
    op.execute("DROP TYPE verificationstatus")
