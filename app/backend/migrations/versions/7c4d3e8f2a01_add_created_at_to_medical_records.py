"""add_created_at_to_medical_records

Revision ID: 7c4d3e8f2a01
Revises: 3f8e2a1c9b05
Create Date: 2026-05-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '7c4d3e8f2a01'
down_revision: Union[str, None] = '3f8e2a1c9b05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'medical_records',
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('NOW()'),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column('medical_records', 'created_at')
