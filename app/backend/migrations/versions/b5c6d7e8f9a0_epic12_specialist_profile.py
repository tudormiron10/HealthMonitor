"""epic12_specialist_profile

Revision ID: b5c6d7e8f9a0
Revises: a1b2c3d4e5f6
Create Date: 2026-05-24

Adds extended profile fields to specialist_profiles and creates three
normalized child tables: specialist_work_experience, specialist_education,
specialist_certifications.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = 'b5c6d7e8f9a0'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # MedicGrade is the only new column-backed enum type; the others
    # (LanguageCode, NutritionSpecialization, SportSpecialization) are stored
    # as plain strings inside JSONB arrays and need no PostgreSQL type.
    op.execute("""
        CREATE TYPE medicgrade AS ENUM (
            'REZIDENT',
            'SPECIALIST',
            'PRIMAR'
        )
    """)

    # --- Extended profile columns on specialist_profiles ---
    op.add_column('specialist_profiles', sa.Column('photo_url', sa.Text(), nullable=True))
    op.add_column('specialist_profiles', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column(
        'specialist_profiles',
        sa.Column('limbi_vorbite', JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
    )
    op.add_column('specialist_profiles', sa.Column('website_url', sa.String(500), nullable=True))
    op.add_column('specialist_profiles', sa.Column('program_lucru', sa.Text(), nullable=True))
    op.add_column(
        'specialist_profiles',
        sa.Column(
            'grad_profesional',
            sa.Enum('REZIDENT', 'SPECIALIST', 'PRIMAR', name='medicgrade', create_type=False),
            nullable=True,
        ),
    )
    op.add_column(
        'specialist_profiles',
        sa.Column('specializari_secundare', JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
    )
    op.add_column(
        'specialist_profiles',
        sa.Column('competente_atestate', JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
    )
    op.add_column(
        'specialist_profiles',
        sa.Column('specializare_nutritie', JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
    )
    op.add_column(
        'specialist_profiles',
        sa.Column('specializare_sportiva', JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
    )
    op.add_column('specialist_profiles', sa.Column('filosofie_profesionala', sa.Text(), nullable=True))
    op.add_column(
        'specialist_profiles',
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('NOW()'),
            nullable=False,
        ),
    )

    # --- specialist_work_experience ---
    op.create_table(
        'specialist_work_experience',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('specialist_profile_id', UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('employer', sa.String(200), nullable=False),
        sa.Column('location', sa.String(200), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('display_order', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(
            ['specialist_profile_id'], ['specialist_profiles.id'], ondelete='CASCADE',
        ),
    )
    op.create_index(
        'ix_specialist_work_experience_profile_id',
        'specialist_work_experience',
        ['specialist_profile_id'],
    )

    # --- specialist_education ---
    op.create_table(
        'specialist_education',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('specialist_profile_id', UUID(as_uuid=True), nullable=False),
        sa.Column('institution', sa.String(200), nullable=False),
        sa.Column('degree', sa.String(200), nullable=False),
        sa.Column('field_of_study', sa.String(200), nullable=True),
        sa.Column('year_completed', sa.Integer(), nullable=False),
        sa.Column('honors', sa.String(200), nullable=True),
        sa.Column('display_order', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(
            ['specialist_profile_id'], ['specialist_profiles.id'], ondelete='CASCADE',
        ),
    )
    op.create_index(
        'ix_specialist_education_profile_id',
        'specialist_education',
        ['specialist_profile_id'],
    )

    # --- specialist_certifications ---
    op.create_table(
        'specialist_certifications',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('specialist_profile_id', UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('issuing_body', sa.String(200), nullable=False),
        sa.Column('certification_number', sa.String(100), nullable=True),
        sa.Column('issue_date', sa.Date(), nullable=False),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('display_order', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(
            ['specialist_profile_id'], ['specialist_profiles.id'], ondelete='CASCADE',
        ),
    )
    op.create_index(
        'ix_specialist_certifications_profile_id',
        'specialist_certifications',
        ['specialist_profile_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_specialist_certifications_profile_id', table_name='specialist_certifications')
    op.drop_table('specialist_certifications')

    op.drop_index('ix_specialist_education_profile_id', table_name='specialist_education')
    op.drop_table('specialist_education')

    op.drop_index('ix_specialist_work_experience_profile_id', table_name='specialist_work_experience')
    op.drop_table('specialist_work_experience')

    op.drop_column('specialist_profiles', 'updated_at')
    op.drop_column('specialist_profiles', 'filosofie_profesionala')
    op.drop_column('specialist_profiles', 'specializare_sportiva')
    op.drop_column('specialist_profiles', 'specializare_nutritie')
    op.drop_column('specialist_profiles', 'competente_atestate')
    op.drop_column('specialist_profiles', 'specializari_secundare')
    op.drop_column('specialist_profiles', 'grad_profesional')
    op.drop_column('specialist_profiles', 'program_lucru')
    op.drop_column('specialist_profiles', 'website_url')
    op.drop_column('specialist_profiles', 'limbi_vorbite')
    op.drop_column('specialist_profiles', 'bio')
    op.drop_column('specialist_profiles', 'photo_url')

    op.execute("DROP TYPE medicgrade")
