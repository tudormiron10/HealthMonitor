"""abe_tables_and_encrypted_markers

Revision ID: e7a1b2c3d4f5
Revises: 1212b95c3024
Create Date: 2026-05-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e7a1b2c3d4f5'
down_revision: Union[str, None] = '1212b95c3024'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'abe_user_keys',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('specialist_user_id', sa.UUID(), nullable=False),
        sa.Column('patient_user_id', sa.UUID(), nullable=False),
        sa.Column('key_blob', sa.LargeBinary(), nullable=False),
        sa.Column(
            'marker_attributes',
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column('issued_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['patient_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['specialist_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_abe_user_keys_specialist_user_id'), 'abe_user_keys', ['specialist_user_id'], unique=False,
    )
    op.create_index(
        op.f('ix_abe_user_keys_patient_user_id'), 'abe_user_keys', ['patient_user_id'], unique=False,
    )
    # Partial unique index: at most one active key per (specialist, patient) pair
    op.create_index(
        'uq_abe_user_keys_active_pair',
        'abe_user_keys',
        ['specialist_user_id', 'patient_user_id'],
        unique=True,
        postgresql_where=sa.text('revoked_at IS NULL'),
    )

    op.create_table(
        'access_requests',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('conversation_id', sa.UUID(), nullable=False),
        sa.Column('specialist_user_id', sa.UUID(), nullable=False),
        sa.Column('patient_user_id', sa.UUID(), nullable=False),
        sa.Column('requested_markers', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('justification', sa.Text(), nullable=False),
        sa.Column(
            'status',
            sa.Enum('PENDING', 'APPROVED', 'DECLINED', 'EXPIRED', name='accessrequeststatus'),
            nullable=False,
        ),
        sa.Column('approved_markers', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['specialist_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_access_requests_patient_status', 'access_requests', ['patient_user_id', 'status'], unique=False,
    )

    op.add_column('medical_records', sa.Column(
        'raw_markers_encrypted', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
    ))
    op.add_column('medical_records', sa.Column(
        'is_encrypted', sa.Boolean(), server_default=sa.text('false'), nullable=False,
    ))


def downgrade() -> None:
    op.drop_column('medical_records', 'is_encrypted')
    op.drop_column('medical_records', 'raw_markers_encrypted')

    op.drop_index('ix_access_requests_patient_status', table_name='access_requests')
    op.drop_table('access_requests')
    op.execute("DROP TYPE accessrequeststatus")

    op.drop_index('uq_abe_user_keys_active_pair', table_name='abe_user_keys')
    op.drop_index(op.f('ix_abe_user_keys_patient_user_id'), table_name='abe_user_keys')
    op.drop_index(op.f('ix_abe_user_keys_specialist_user_id'), table_name='abe_user_keys')
    op.drop_table('abe_user_keys')
