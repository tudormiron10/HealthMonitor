"""Unit tests for PredictionService — API integration of the ML pipeline."""

import numpy as np
import pandas as pd
import pytest

from application.prediction_service import (
    FEATURE_TO_MARKER,
    MARKER_TO_FEATURE,
    PredictionService,
)
from tests.builders import make_bundle

DIABET_CLASSES = {0: "Sanatos", 1: "Borderline", 2: "Diabet"}


class _BoomEstimator:
    """Estimator that raises — used to prove a Model A failure is swallowed."""

    def predict(self, X):
        raise RuntimeError("model A boom")

    def predict_proba(self, X):
        raise RuntimeError("model A boom")


class _RecordingTransformer:
    """Imputer/scaler stub that records the DataFrame it receives."""

    def __init__(self) -> None:
        self.sample_posterior = True
        self.received = None

    def transform(self, X):
        self.received = X
        return np.asarray(X, dtype=float)


class TestRunPredictions:
    def test_given_binary_condition_when_run_then_risk_is_probability_of_class_one(
        self, prediction_service
    ):
        # Arrange
        models = {"anemie": {"a": None, "b": make_bundle(predicted_class=1, proba=(0.3, 0.7))}}

        # Act
        out = prediction_service.run_predictions({}, models)

        # Assert
        assert out["anemie"]["probability"] == 0.7
        assert out["anemie"]["predicted_class"] == 1
        assert out["anemie"]["label"] == "Risc Crescut"

    def test_given_diabetes_three_class_when_run_then_risk_is_p1_plus_p2(
        self, prediction_service
    ):
        # Arrange — diabetes risk = P(Borderline) + P(Diabet)
        bundle = make_bundle(predicted_class=2, proba=(0.5, 0.2, 0.3), clase=DIABET_CLASSES)
        models = {"diabet": {"a": None, "b": bundle}}

        # Act
        out = prediction_service.run_predictions({}, models)

        # Assert
        assert out["diabet"]["probability"] == 0.5
        assert out["diabet"]["predicted_class"] == 2
        assert out["diabet"]["label"] == "Diabet"

    def test_given_decisive_marker_present_and_model_a_loaded_when_run_then_model_a_attached(
        self, prediction_service
    ):
        # Arrange — hemoglobin is a decisive marker for anemia
        models = {
            "anemie": {
                "a": make_bundle(predicted_class=1, proba=(0.1, 0.9)),
                "b": make_bundle(predicted_class=0, proba=(0.6, 0.4)),
            }
        }

        # Act
        out = prediction_service.run_predictions({"hemoglobin": 10.0}, models)

        # Assert — Model B drives the result; Model A is attached for display only
        assert out["anemie"]["decisive_marker_present"] is True
        assert out["anemie"]["probability"] == 0.4
        assert out["anemie"]["model_a"]["probability"] == 0.9
        assert out["anemie"]["model_a"]["predicted_class"] == 1

    def test_given_no_decisive_marker_when_run_then_model_a_absent(self, prediction_service):
        # Arrange — both variants loaded, but no decisive marker in the input
        models = {
            "anemie": {
                "a": make_bundle(predicted_class=1, proba=(0.1, 0.9)),
                "b": make_bundle(predicted_class=0, proba=(0.6, 0.4)),
            }
        }

        # Act
        out = prediction_service.run_predictions({"bmi": 25.0}, models)

        # Assert
        assert out["anemie"]["decisive_marker_present"] is False
        assert "model_a" not in out["anemie"]

    def test_given_decisive_marker_present_but_model_a_not_loaded_when_run_then_no_model_a(
        self, prediction_service
    ):
        # Arrange
        models = {"anemie": {"a": None, "b": make_bundle(predicted_class=0, proba=(0.6, 0.4))}}

        # Act
        out = prediction_service.run_predictions({"hemoglobin": 10.0}, models)

        # Assert
        assert out["anemie"]["decisive_marker_present"] is True
        assert "model_a" not in out["anemie"]

    def test_given_model_b_not_loaded_when_run_then_error_result(self, prediction_service):
        # Arrange
        models = {"anemie": {"a": None, "b": None}}

        # Act
        out = prediction_service.run_predictions({}, models)

        # Assert
        assert out["anemie"]["probability"] is None
        assert out["anemie"]["predicted_class"] is None
        assert out["anemie"]["label"] == "Error"
        assert out["anemie"]["error"] == "Model B not loaded"

    def test_given_model_a_raises_when_run_then_model_b_result_still_returned(
        self, prediction_service
    ):
        # Arrange — Model A estimator blows up; Model B is healthy
        broken_a = make_bundle()
        broken_a["model"] = _BoomEstimator()
        models = {
            "anemie": {
                "a": broken_a,
                "b": make_bundle(predicted_class=0, proba=(0.55, 0.45)),
            }
        }

        # Act — must not raise
        out = prediction_service.run_predictions({"hemoglobin": 10.0}, models)

        # Assert — Model A failure is swallowed; Model B result survives
        assert out["anemie"]["probability"] == 0.45
        assert "model_a" not in out["anemie"]

    def test_given_marker_absent_when_predict_then_value_is_nan(self, prediction_service):
        # Arrange — predictori Sex/Varsta/BMI ; only bmi supplied
        recorder = _RecordingTransformer()
        bundle = make_bundle(predictori=["Sex", "Varsta", "BMI"])
        bundle["imputer"] = recorder
        models = {"anemie": {"a": None, "b": bundle}}

        # Act
        prediction_service.run_predictions({"bmi": 25.0}, models)

        # Assert — supplied marker mapped, missing markers became NaN
        assert recorder.received["BMI"].iloc[0] == 25.0
        assert pd.isna(recorder.received["Sex"].iloc[0])
        assert pd.isna(recorder.received["Varsta"].iloc[0])

    def test_given_imputer_with_sample_posterior_when_predict_then_set_false(
        self, prediction_service
    ):
        # Arrange — make_bundle's imputer starts with sample_posterior=True
        bundle = make_bundle()
        models = {"anemie": {"a": None, "b": bundle}}

        # Act
        prediction_service.run_predictions({}, models)

        # Assert — determinism invariant: forced to False before transform
        assert bundle["imputer"].sample_posterior is False

    def test_given_model_b_raises_when_run_then_error_result(self, prediction_service):
        # Arrange — the Model B estimator blows up during _predict_single
        broken_b = make_bundle()
        broken_b["model"] = _BoomEstimator()
        models = {"anemie": {"a": None, "b": broken_b}}

        # Act — must not raise; the failure is captured per-condition
        out = prediction_service.run_predictions({}, models)

        # Assert
        assert out["anemie"]["probability"] is None
        assert out["anemie"]["label"] == "Error"
        assert out["anemie"]["error"]


class TestCalculateHealthScore:
    @pytest.mark.parametrize(
        "probs, expected",
        [
            ({}, 0),
            ({"anemie": 1.0, "diabet": 1.0}, 0),
            ({"anemie": 0.0, "diabet": 0.0}, 100),
        ],
        ids=["empty->0", "all_max->0", "all_zero->100"],
    )
    def test_simple_cases(self, prediction_service, probs, expected):
        # Arrange
        predictions = {c: {"probability": p} for c, p in probs.items()}

        # Act + Assert
        assert prediction_service.calculate_health_score(predictions) == expected

    def test_given_all_conditions_with_one_at_max_when_score_then_partial(
        self, prediction_service
    ):
        # Arrange — every condition present (weights sum to 1.0); only anemie at max
        from core.constants import CONDITION_WEIGHTS

        predictions = {c: {"probability": 0.0} for c in CONDITION_WEIGHTS}
        predictions["anemie"]["probability"] = 1.0

        # Act + Assert — anemie weight 0.03 -> round(100 * (1 - 0.03)) = 97
        assert prediction_service.calculate_health_score(predictions) == 97

    def test_given_errored_condition_when_score_then_excluded_and_renormalized(
        self, prediction_service
    ):
        # Arrange — diabet has no probability (errored) and must be dropped
        predictions = {
            "risc_cardiovascular": {"probability": 0.0},   # weight 0.25
            "anemie": {"probability": 1.0},                # weight 0.03
            "diabet": {"probability": None, "label": "Error"},
        }

        # Act + Assert — weights renormalize over {0.25, 0.03}; (0.03/0.28) -> score 89
        assert prediction_service.calculate_health_score(predictions) == 89

    def test_given_known_mixed_probabilities_when_score_then_matches_weighted_formula(
        self, prediction_service
    ):
        # Arrange
        predictions = {
            "risc_cardiovascular": {"probability": 0.2},   # weight 0.25
            "boala_renala": {"probability": 0.5},          # weight 0.20
            "anemie": {"probability": 0.4},                # weight 0.03
        }

        # Act + Assert — total 0.48; weighted_risk 0.3375 -> round(66.25) = 66
        assert prediction_service.calculate_health_score(predictions) == 66

    def test_given_only_unweighted_condition_when_score_then_returns_zero(
        self, prediction_service
    ):
        # Arrange — a condition absent from CONDITION_WEIGHTS is ignored
        predictions = {"not_a_real_condition": {"probability": 0.5}}

        # Act + Assert
        assert prediction_service.calculate_health_score(predictions) == 0


class TestMarkerMapping:
    def test_given_marker_to_feature_when_inspected_then_values_nonempty_and_unique(self):
        # Arrange
        values = list(MARKER_TO_FEATURE.values())

        # Act + Assert
        assert all(v and v.strip() for v in values)
        assert len(set(values)) == len(values)

    def test_given_marker_to_feature_when_reversed_then_round_trips(self):
        # Act + Assert
        assert len(FEATURE_TO_MARKER) == len(MARKER_TO_FEATURE)
        for api_key, column in MARKER_TO_FEATURE.items():
            assert FEATURE_TO_MARKER[column] == api_key
