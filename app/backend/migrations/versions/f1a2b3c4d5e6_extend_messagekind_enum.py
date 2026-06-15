"""Extend messagekind enum with ACCESS_REQUEST and ACCESS_RESPONSE.

Revision ID: f1a2b3c4d5e6
Revises: e7a1b2c3d4f5
Create Date: 2026-05-26

"""
from alembic import op

revision = 'f1a2b3c4d5e6'
down_revision = 'e7a1b2c3d4f5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE messagekind ADD VALUE IF NOT EXISTS 'ACCESS_REQUEST'")
    op.execute("ALTER TYPE messagekind ADD VALUE IF NOT EXISTS 'ACCESS_RESPONSE'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; downgrade is a no-op.
    pass
