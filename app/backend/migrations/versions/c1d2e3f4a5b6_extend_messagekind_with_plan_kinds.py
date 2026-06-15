"""Extend messagekind enum with MEAL_PLAN and WORKOUT_PLAN.

Revision ID: c1d2e3f4a5b6
Revises: f1a2b3c4d5e6
Create Date: 2026-06-05

"""
from alembic import op

revision = 'c1d2e3f4a5b6'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE messagekind ADD VALUE IF NOT EXISTS 'MEAL_PLAN'")
    op.execute("ALTER TYPE messagekind ADD VALUE IF NOT EXISTS 'WORKOUT_PLAN'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; downgrade is a no-op.
    pass
