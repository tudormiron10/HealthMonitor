"""Shared application constants.

Values here are the single source of truth — changing them affects every
feature that imports them. Do not duplicate these literals elsewhere."""

from infrastructure.persistence.models.enums import MedicalSpecialization

RED_FLAG_THRESHOLD: float = 0.7

CONDITION_WEIGHTS: dict[str, float] = {
    "risc_cardiovascular": 0.25,   # Framingham: highest 10-yr CVD mortality driver
    "boala_renala":        0.20,   # Charlson CCI weight 2; progression to ESRD
    "diabet":              0.15,   # Charlson CCI weight 1; multi-organ damage
    "sindrom_metabolic":   0.12,   # IDF/ATP III: clusters CVD + DM multiplicatively
    "hipertensiune":       0.10,   # JNC 8: major modifiable stroke/CVD driver
    "steatoza_hepatica":   0.08,   # Bedogni FLI; high reversibility reduces weight
    "dislipidemie":        0.07,   # ACC/AHA: modifiable via lifestyle intervention
    "anemie":              0.03,   # WHO 2011: often secondary; lowest independent mortality
}

"""Markers whose presence in a submitted record triggers Model A inference for
that condition. Any one non-null marker in the list is sufficient.
Keys match MARKER_TO_FEATURE in prediction_service.py — any mismatch silently
skips Model A for that condition without an error.
"""
DECISIVE_MARKERS: dict[str, list[str]] = {
    "diabet":              ["hba1c", "fasting_glucose"],
    "anemie":              ["hemoglobin"],
    "boala_renala":        ["creatinine", "uacr"],
    "hipertensiune":       ["systolic_bp", "diastolic_bp"],
    "dislipidemie":        ["ldl", "hdl", "total_cholesterol"],
    "sindrom_metabolic":   ["waist_circumference"],
    "steatoza_hepatica":   ["alt", "ggt"],
    "risc_cardiovascular": ["total_cholesterol", "hdl", "systolic_bp"],
}


"""Markers that every specialist can decrypt by default. Their encryption
policy is the patient-scope clause alone (``patient:<uuid>``) — no
specialization restriction.
"""
UNIVERSAL_MARKERS: frozenset[str] = frozenset({"sex", "age", "bmi"})


_MS = MedicalSpecialization

"""Default Layer-1 access matrix: marker key -> specializations that can decrypt
the marker without a consent request.
"""
MARKER_TO_SPECIALIZATIONS: dict[str, list[MedicalSpecialization]] = {
    # Universal — accessible to every specialist holding any key for this patient
    "sex":                [],
    "age":                [],
    "bmi":                [],
    # Anthropometric
    "waist_circumference": [
        _MS.ENDOCRINOLOGIE,
        _MS.DIABET_NUTRITIE_BOLI_METABOLICE,
        _MS.NUTRITIONIST,
        _MS.COACH,
        _MS.MEDICINA_INTERNA,
    ],
    # Blood pressure
    "systolic_bp": [
        _MS.CARDIOLOGIE,
        _MS.DIABET_NUTRITIE_BOLI_METABOLICE,
        _MS.NEFROLOGIE,
        _MS.MEDICINA_INTERNA,
    ],
    "diastolic_bp": [
        _MS.CARDIOLOGIE,
        _MS.DIABET_NUTRITIE_BOLI_METABOLICE,
        _MS.NEFROLOGIE,
        _MS.MEDICINA_INTERNA,
    ],
    # Glycemic
    "hba1c": [
        _MS.ENDOCRINOLOGIE,
        _MS.DIABET_NUTRITIE_BOLI_METABOLICE,
        _MS.NUTRITIONIST,
        _MS.MEDICINA_INTERNA,
    ],
    "fasting_glucose": [
        _MS.ENDOCRINOLOGIE,
        _MS.DIABET_NUTRITIE_BOLI_METABOLICE,
        _MS.NUTRITIONIST,
        _MS.MEDICINA_INTERNA,
    ],
    # Lipid panel
    "total_cholesterol": [
        _MS.CARDIOLOGIE,
        _MS.ENDOCRINOLOGIE,
        _MS.DIABET_NUTRITIE_BOLI_METABOLICE,
        _MS.NUTRITIONIST,
        _MS.MEDICINA_INTERNA,
    ],
    "hdl": [
        _MS.CARDIOLOGIE,
        _MS.ENDOCRINOLOGIE,
        _MS.DIABET_NUTRITIE_BOLI_METABOLICE,
        _MS.NUTRITIONIST,
        _MS.MEDICINA_INTERNA,
    ],
    "ldl": [
        _MS.CARDIOLOGIE,
        _MS.ENDOCRINOLOGIE,
        _MS.DIABET_NUTRITIE_BOLI_METABOLICE,
        _MS.NUTRITIONIST,
        _MS.MEDICINA_INTERNA,
    ],
    "triglycerides": [
        _MS.CARDIOLOGIE,
        _MS.ENDOCRINOLOGIE,
        _MS.DIABET_NUTRITIE_BOLI_METABOLICE,
        _MS.HEPATOLOGIE,
        _MS.NUTRITIONIST,
        _MS.MEDICINA_INTERNA,
    ],
    # Inflammation
    "crp": [
        _MS.CARDIOLOGIE,
        _MS.HEMATOLOGIE,
        _MS.MEDICINA_INTERNA,
    ],
    # Hepatic enzymes
    "alt": [_MS.GASTROENTEROLOGIE, _MS.HEPATOLOGIE, _MS.MEDICINA_INTERNA],
    "ast": [_MS.GASTROENTEROLOGIE, _MS.HEPATOLOGIE, _MS.MEDICINA_INTERNA],
    "ggt": [_MS.GASTROENTEROLOGIE, _MS.HEPATOLOGIE, _MS.MEDICINA_INTERNA],
    # Renal
    "creatinine": [_MS.NEFROLOGIE, _MS.UROLOGIE, _MS.MEDICINA_INTERNA],
    "urea":       [_MS.NEFROLOGIE, _MS.UROLOGIE, _MS.MEDICINA_INTERNA],
    "uric_acid":  [_MS.NEFROLOGIE, _MS.UROLOGIE, _MS.MEDICINA_INTERNA],
    "uacr": [
        _MS.DIABET_NUTRITIE_BOLI_METABOLICE,
        _MS.HEPATOLOGIE,
        _MS.NEFROLOGIE,
        _MS.UROLOGIE,
        _MS.MEDICINA_INTERNA,
    ],
    # Hematological
    "hemoglobin": [_MS.NEFROLOGIE, _MS.HEMATOLOGIE, _MS.MEDICINA_INTERNA],
    "mcv":        [_MS.HEMATOLOGIE, _MS.MEDICINA_INTERNA],
    "ferritin": [
        _MS.GASTROENTEROLOGIE,
        _MS.HEPATOLOGIE,
        _MS.HEMATOLOGIE,
        _MS.NUTRITIONIST,
        _MS.MEDICINA_INTERNA,
    ],
    "folate": [_MS.HEMATOLOGIE, _MS.NUTRITIONIST, _MS.MEDICINA_INTERNA],
    # Metabolic — fat-soluble vitamin
    "vitamin_d": [
        _MS.ENDOCRINOLOGIE,
        _MS.DIABET_NUTRITIE_BOLI_METABOLICE,
        _MS.NUTRITIONIST,
        _MS.MEDICINA_INTERNA,
    ],
    # Lifestyle
    "smoker_status": [_MS.CARDIOLOGIE, _MS.MEDICINA_INTERNA],
}


"""UI-only clinical grouping for the access request modal and the patient
consent sub-dialog. NOT used by encryption — encryption is per-marker.
Keys are stable identifiers (i18n: markerGroups.<key>). Every marker
appears in exactly one group; the invariant block below enforces it.
"""
MARKER_GROUPS: dict[str, list[str]] = {
    "universal": ["sex", "age", "bmi"],
    "cardiovascular": [
        "systolic_bp",
        "diastolic_bp",
        "total_cholesterol",
        "ldl",
        "hdl",
        "triglycerides",
        "smoker_status",
        "crp",
    ],
    "metabolic": [
        "fasting_glucose",
        "hba1c",
        "waist_circumference",
        "uacr",
        "vitamin_d",
    ],
    "hepatic": ["alt", "ast", "ggt"],
    "renal": ["creatinine", "urea", "uric_acid"],
    "hematological": ["hemoglobin", "mcv", "ferritin", "folate"],
}


"""Self-check that ABE Layer 1 constants stay aligned with the ML feature
mapping. Runs once when this module is first imported, so any drift
surfaces at server startup instead of at the first encryption attempt.
"""
from application.prediction_service import MARKER_TO_FEATURE as _MARKER_TO_FEATURE  # noqa: E402

_feature_keys = set(_MARKER_TO_FEATURE)
_matrix_keys = set(MARKER_TO_SPECIALIZATIONS)
if _feature_keys != _matrix_keys:
    raise AssertionError(
        "MARKER_TO_SPECIALIZATIONS drift vs MARKER_TO_FEATURE — "
        f"missing: {sorted(_feature_keys - _matrix_keys)}, "
        f"extra: {sorted(_matrix_keys - _feature_keys)}"
    )

_grouped: list[str] = [m for members in MARKER_GROUPS.values() for m in members]
if len(_grouped) != len(set(_grouped)):
    _seen: set[str] = set()
    _dups = sorted({m for m in _grouped if m in _seen or _seen.add(m)})  # type: ignore[func-returns-value]
    raise AssertionError(f"MARKER_GROUPS contains duplicate markers: {_dups}")
if set(_grouped) != _feature_keys:
    raise AssertionError(
        "MARKER_GROUPS drift vs MARKER_TO_FEATURE — "
        f"missing: {sorted(_feature_keys - set(_grouped))}, "
        f"extra: {sorted(set(_grouped) - _feature_keys)}"
    )

if UNIVERSAL_MARKERS != set(MARKER_GROUPS["universal"]):
    raise AssertionError("UNIVERSAL_MARKERS must equal MARKER_GROUPS['universal']")

del _MARKER_TO_FEATURE, _feature_keys, _matrix_keys, _grouped
