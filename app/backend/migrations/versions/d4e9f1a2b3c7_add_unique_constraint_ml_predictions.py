"""add_unique_constraint_ml_predictions

Revision ID: d4e9f1a2b3c7
Revises: 6863abb0ea9a
Create Date: 2026-06-13 20:10:00.000000

Enforces one prediction per (medical_record_id, model_version). Predictions are
deterministic, so a second row for the same record + model version is always a
duplicate. Existing duplicates must be removed first via
scripts/cleanup_duplicate_predictions.py.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd4e9f1a2b3c7'
down_revision: Union[str, None] = '6863abb0ea9a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_CONSTRAINT_NAME = "uq_ml_predictions_record_model"


def upgrade() -> None:
    op.create_unique_constraint(
        _CONSTRAINT_NAME,
        "ml_predictions",
        ["medical_record_id", "model_version"],
    )


def downgrade() -> None:
    op.drop_constraint(_CONSTRAINT_NAME, "ml_predictions", type_="unique")
