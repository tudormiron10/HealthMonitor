"""ML Model Loader — loads the best .pkl models at server startup.

Each .pkl file is a joblib-serialized dict containing:
    - model: the trained estimator
    - imputer: IterativeImputer fitted on training data
    - scaler: StandardScaler fitted on training data
    - predictori: list of feature column names
    - varianta: 'ModelA' or 'ModelB'
    - clase: dict mapping class codes to labels
    - target: name of the prediction target
"""

import logging
from pathlib import Path

import joblib

logger = logging.getLogger(__name__)

BEST_MODELS_B: dict[str, str] = {
    "risc_cardiovascular": "ModelB_RandomForest.pkl",
    "steatoza_hepatica":   "ModelB_XGBoost.pkl",
    "boala_renala":        "ModelB_XGBoost.pkl",
    "anemie":              "ModelB_XGBoost.pkl",
    "sindrom_metabolic":   "ModelB_XGBoost.pkl",
    "hipertensiune":       "ModelB_XGBoost.pkl",
    "dislipidemie":        "ModelB_RandomForest.pkl",
    "diabet":              "ModelB_XGBoost.pkl",
}

BEST_MODELS_A: dict[str, str] = {
    "risc_cardiovascular": "ModelA_XGBoost.pkl",
    "steatoza_hepatica":   "ModelA_XGBoost.pkl",
    "boala_renala":        "ModelA_XGBoost.pkl",
    "anemie":              "ModelA_XGBoost.pkl",
    "sindrom_metabolic":   "ModelA_XGBoost.pkl",
    "hipertensiune":       "ModelA_XGBoost.pkl",
    "dislipidemie":        "ModelA_RandomForest.pkl",
    "diabet":              "ModelA_XGBoost.pkl",
}


def _load_bundle(pkl_path: Path, label: str) -> dict | None:
    """Load a model bundle from disk, returning None on failure."""
    if not pkl_path.exists():
        logger.warning("Model file not found: %s", pkl_path)
        return None
    try:
        bundle = joblib.load(pkl_path)
        logger.info(
            "Loaded %-35s (%d features)",
            label,
            len(bundle.get("predictori", [])),
        )
        return bundle
    except Exception as exc:
        logger.error("Failed to load %s: %s", label, exc)
        return None


def load_all_models(models_root: str | Path) -> dict[str, dict[str, dict | None]]:
    """Scan the models directory and load Model A and Model B for each condition.

    Returns:
        Nested dict keyed by condition slug:
        ``{"condition": {"a": bundle_or_none, "b": bundle_or_none}}``.
    """
    models_root = Path(models_root).resolve()
    loaded: dict[str, dict[str, dict | None]] = {}

    if not models_root.exists():
        logger.error("ML models directory does not exist: %s", models_root)
        return loaded

    for condition_slug in BEST_MODELS_B:
        resultat_dir = models_root / condition_slug / "rezultate"

        bundle_b = _load_bundle(
            resultat_dir / BEST_MODELS_B[condition_slug],
            f"{condition_slug}/B",
        )
        bundle_a = _load_bundle(
            resultat_dir / BEST_MODELS_A[condition_slug],
            f"{condition_slug}/A",
        )

        loaded[condition_slug] = {"a": bundle_a, "b": bundle_b}

    b_count = sum(1 for v in loaded.values() if v["b"] is not None)
    a_count = sum(1 for v in loaded.values() if v["a"] is not None)
    logger.info(
        "ML Engine ready: %d/%d Model B, %d/%d Model A loaded.",
        b_count, len(BEST_MODELS_B),
        a_count, len(BEST_MODELS_A),
    )
    return loaded
