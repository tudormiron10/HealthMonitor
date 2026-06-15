"""Prediction service — runs the ML pipeline on patient markers."""

import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

BINARY_CONDITIONS = [
    "risc_cardiovascular",
    "steatoza_hepatica",
    "boala_renala",
    "anemie",
    "sindrom_metabolic",
    "hipertensiune",
    "dislipidemie",
]

MODEL_VERSION = "v1.0-ModelB"

MARKER_TO_FEATURE: dict[str, str] = {
    "sex": "Sex",
    "age": "Varsta",
    "bmi": "BMI",
    "waist_circumference": "Circumferinta_Abdominala",
    "systolic_bp": "Tensiune_Sistolica",
    "diastolic_bp": "Tensiune_Diastolica",
    "hba1c": "HbA1c_Glicata",
    "fasting_glucose": "Glicemie_Fasting",
    "total_cholesterol": "Colesterol_Total",
    "hdl": "Colesterol_HDL",
    "ldl": "Colesterol_LDL",
    "triglycerides": "Trigliceride",
    "crp": "Inflamatie_CRP",
    "alt": "Ficat_ALT",
    "ast": "Ficat_AST",
    "ggt": "Ficat_GGT",
    "creatinine": "Creatinina_Sange",
    "urea": "Uree_Sange",
    "uacr": "Albumina_Urina_Ratio",
    "uric_acid": "Acid_Uric",
    "hemoglobin": "Hemoglobina",
    "mcv": "MCV_Volum_Eritrocitar",
    "ferritin": "Feritina_Fier",
    "vitamin_d": "Vitamina_D",
    "folate": "Folat_Acid_Folic",
    "smoker_status": "Status_Fumator",
}

FEATURE_TO_MARKER: dict[str, str] = {v: k for k, v in MARKER_TO_FEATURE.items()}


class PredictionService:
    """Stateless service that orchestrates ML predictions."""

    def run_predictions(self, raw_markers: dict, models: dict[str, dict]) -> dict:
        """Run all loaded models against the provided markers.

        Args:
            raw_markers: dict of marker values (keys matching MedicalMarkers fields).
            models: nested dict ``{"condition": {"a": bundle_or_none, "b": bundle_or_none}}``.

        Returns:
            Dict with per-condition results. When a decisive marker for the condition
            is present in ``raw_markers`` and Model A is loaded, the result includes
            a ``model_a`` sub-dict alongside the primary Model B result::

                {
                    "diabet": {
                        "probability": 0.47,
                        "predicted_class": 1,
                        "label": "Borderline",
                        "decisive_marker_present": True,
                        "model_a": {
                            "probability": 0.94,
                            "predicted_class": 2,
                            "label": "Diabetic",
                        },
                    },
                    "anemie": {
                        "probability": 0.12,
                        "predicted_class": 0,
                        "label": "Sanatos",
                        "decisive_marker_present": False,
                    },
                }
        """
        from core.constants import DECISIVE_MARKERS

        results: dict[str, dict] = {}

        for condition, variant_bundles in models.items():
            bundle_b = variant_bundles.get("b")
            bundle_a = variant_bundles.get("a")

            decisive_keys = DECISIVE_MARKERS.get(condition, [])
            decisive_present = any(
                raw_markers.get(k) is not None for k in decisive_keys
            )

            if bundle_b is None:
                logger.warning("Model B not loaded for %s — skipping", condition)
                results[condition] = {
                    "probability": None,
                    "predicted_class": None,
                    "label": "Error",
                    "decisive_marker_present": decisive_present,
                    "error": "Model B not loaded",
                }
                continue

            try:
                result = self._predict_single(condition, bundle_b, raw_markers)
                result["decisive_marker_present"] = decisive_present

                if decisive_present and bundle_a is not None:
                    try:
                        a_result = self._predict_single(condition, bundle_a, raw_markers)
                        result["model_a"] = {
                            "probability": a_result["probability"],
                            "predicted_class": a_result["predicted_class"],
                            "label": a_result["label"],
                        }
                    except Exception as exc:
                        logger.warning("Model A prediction failed for %s: %s", condition, exc)

                results[condition] = result
            except Exception as exc:
                logger.error("Prediction failed for %s: %s", condition, exc)
                results[condition] = {
                    "probability": None,
                    "predicted_class": None,
                    "label": "Error",
                    "decisive_marker_present": decisive_present,
                    "error": str(exc),
                }

        return results

    def _predict_single(
        self, condition: str, bundle: dict, raw_markers: dict,
    ) -> dict:
        """Run a single model's pipeline: impute -> scale -> predict."""
        model = bundle["model"]
        imputer = bundle["imputer"]
        scaler = bundle["scaler"]
        feature_names: list[str] = bundle["predictori"]
        clase_map: dict = bundle["clase"]


        row_data = {}
        for col in feature_names:
            api_key = FEATURE_TO_MARKER.get(col)
            if api_key and api_key in raw_markers and raw_markers[api_key] is not None:
                row_data[col] = raw_markers[api_key]
            else:
                row_data[col] = np.nan
        df_input = pd.DataFrame([row_data], columns=feature_names)

        if hasattr(imputer, 'sample_posterior'):
            imputer.sample_posterior = False
            
        df_imputed = pd.DataFrame(
            imputer.transform(df_input), columns=feature_names,
        )
        df_scaled = pd.DataFrame(
            scaler.transform(df_imputed), columns=feature_names,
        )

        predicted_class = int(model.predict(df_scaled)[0])
        probabilities = model.predict_proba(df_scaled)[0]

        if condition == "diabet":
            risk_probability = float(probabilities[1] + probabilities[2])
        else:
            risk_probability = float(probabilities[1])

        label = clase_map.get(predicted_class, str(predicted_class))

        logger.debug(
            "Prediction %s: class=%d (%s), risk_prob=%.3f",
            condition, predicted_class, label, risk_probability,
        )

        return {
            "probability": round(risk_probability, 4),
            "predicted_class": predicted_class,
            "label": label,
        }

    def calculate_health_score(self, predictions: dict) -> int:
        """Compute a weighted health score from 0 (worst) to 100 (best)."""
        from core.constants import CONDITION_WEIGHTS

        valid = {
            cond: pred["probability"]
            for cond, pred in predictions.items()
            if pred.get("probability") is not None and cond in CONDITION_WEIGHTS
        }

        if not valid:
            return 0

        total_weight = sum(CONDITION_WEIGHTS[cond] for cond in valid)
        weighted_risk = sum(
            (CONDITION_WEIGHTS[cond] / total_weight) * prob
            for cond, prob in valid.items()
        )
        score = int(round(100 * (1 - weighted_risk)))
        return max(0, min(100, score))
