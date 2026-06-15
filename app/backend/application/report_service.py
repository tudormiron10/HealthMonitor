"""PDF report generation service — produces downloadable PDF for a prediction run.

Uses fpdf2 (pure-Python, no system dependencies).
Font: Segoe UI / Arial (Windows) or DejaVu Sans (Linux) for Romanian diacritics.
Falls back to Helvetica (Latin-1) if no Unicode TTF is found.
"""

import logging
from datetime import datetime
from io import BytesIO
from pathlib import Path

from fpdf import FPDF

logger = logging.getLogger(__name__)


_LABELS: dict[str, dict] = {
    "ro": {
        "title":               "Raport Medical Personalizat",
        "patient":             "Pacient",
        "record_date":         "Data analizelor",
        "generated_at":        "Generat la",
        "disclaimer": (
            "ATENTIE: Acest raport este un instrument de suport decizional "
            "si nu inlocuieste consultul medical licentiat."
        ),
        "health_score_title":  "Scor de Sanatate",
        "health_score_low":    "Risc Scazut",
        "health_score_medium": "Risc Moderat",
        "health_score_high":   "Risc Ridicat",
        "risk_table_title":    "Sumar Riscuri pe Conditii",
        "risk_col_condition":  "Conditie",
        "risk_col_prob":       "Risc (%)",
        "risk_col_label":      "Clasa",
        "risk_col_level":      "Nivel",
        "markers_table_title": "Markeri Medicali Analizati",
        "markers_col_name":    "Marker",
        "markers_col_value":   "Valoare",
        "markers_col_ref":     "Referinta",
        "footer":              "HealthMonitor - Instrument de suport, nu diagnostic medical.",
        "page":                "Pagina",
        "conditions": {
            "risc_cardiovascular": "Risc Cardiovascular",
            "boala_renala":        "Boala Renala",
            "diabet":              "Diabet",
            "sindrom_metabolic":   "Sindrom Metabolic",
            "hipertensiune":       "Hipertensiune",
            "steatoza_hepatica":   "Steatoza Hepatica",
            "dislipidemie":        "Dislipidemie",
            "anemie":              "Anemie",
        },
        "risk_levels": {"high": "Ridicat", "medium": "Moderat", "low": "Scazut"},
        "plan": {
            "meal_plan_label":   "Plan Alimentar",
            "workout_plan_label":"Plan de Antrenament",
            "sent_by":           "Trimis de",
            "sent_on":           "Data",
            "content_title":     "Continut plan",
            "disclaimer": (
                "ATENTIE: Planul de mai jos este un instrument de suport si nu inlocuieste "
                "consultul medical sau nutritional licentiat."
            ),
            "footer": "HealthMonitor - Instrument de suport, nu diagnostic medical.",
        },
        "classes": {
            "risc_cardiovascular": {0: "Risc Normal",            1: "Risc Crescut"},
            "boala_renala":        {0: "Rinichi Sanatos",         1: "Boala Renala"},
            "diabet":              {0: "Glicemie Normala",        1: "Prediabet",             2: "Diabet"},
            "sindrom_metabolic":   {0: "Fara Sindrom Metabolic",  1: "Sindrom Metabolic"},
            "hipertensiune":       {0: "Tensiune Normala",        1: "Hipertensiune"},
            "steatoza_hepatica":   {0: "Ficat Sanatos",           1: "Steatoza Hepatica"},
            "dislipidemie":        {0: "Lipide Normale",          1: "Dislipidemie"},
            "anemie":              {0: "Hemoglobina Normala",     1: "Anemie"},
        },
        "markers": {
            "hba1c":              "HbA1c",
            "fasting_glucose":    "Glicemie Fasting",
            "ldl":                "LDL Colesterol",
            "total_cholesterol":  "Colesterol Total",
            "triglycerides":      "Trigliceride",
            "hdl":                "HDL Colesterol",
            "systolic_bp":        "Tensiune Sistolica",
            "diastolic_bp":       "Tensiune Diastolica",
            "bmi":                "BMI",
            "waist_circumference":"Circumferinta Abdominala",
            "hemoglobin":         "Hemoglobina",
            "mcv":                "MCV",
            "ferritin":           "Feritina",
            "alt":                "ALT (TGP)",
            "ast":                "AST (TGO)",
            "ggt":                "GGT",
            "crp":                "CRP",
            "creatinine":         "Creatinina",
            "urea":               "Uree",
            "uacr":               "UACR",
            "uric_acid":          "Acid Uric",
            "vitamin_d":          "Vitamina D",
            "folate":             "Folat",
            "smoker_status":      "Status Fumator",
            "sex":                "Sex",
            "age":                "Varsta",
        },
    },
    "en": {
        "title":               "Personalized Medical Report",
        "patient":             "Patient",
        "record_date":         "Record date",
        "generated_at":        "Generated at",
        "disclaimer": (
            "NOTICE: This report is a decision-support tool and does not "
            "replace a licensed medical consultation."
        ),
        "health_score_title":  "Health Score",
        "health_score_low":    "Low Risk",
        "health_score_medium": "Moderate Risk",
        "health_score_high":   "High Risk",
        "risk_table_title":    "Risk Summary by Condition",
        "risk_col_condition":  "Condition",
        "risk_col_prob":       "Risk (%)",
        "risk_col_label":      "Class",
        "risk_col_level":      "Level",
        "markers_table_title": "Medical Markers Analyzed",
        "markers_col_name":    "Marker",
        "markers_col_value":   "Value",
        "markers_col_ref":     "Reference",
        "footer":              "HealthMonitor - Decision-support tool, not a medical diagnosis.",
        "page":                "Page",
        "conditions": {
            "risc_cardiovascular": "Cardiovascular Risk",
            "boala_renala":        "Kidney Disease",
            "diabet":              "Diabetes",
            "sindrom_metabolic":   "Metabolic Syndrome",
            "hipertensiune":       "Hypertension",
            "steatoza_hepatica":   "Fatty Liver",
            "dislipidemie":        "Dyslipidemia",
            "anemie":              "Anemia",
        },
        "risk_levels": {"high": "High", "medium": "Moderate", "low": "Low"},
        "plan": {
            "meal_plan_label":   "Meal Plan",
            "workout_plan_label":"Workout Plan",
            "sent_by":           "Sent by",
            "sent_on":           "Date",
            "content_title":     "Plan content",
            "disclaimer": (
                "NOTICE: The plan below is a decision-support tool and does not replace "
                "a licensed medical or nutritional consultation."
            ),
            "footer": "HealthMonitor - Decision-support tool, not a medical diagnosis.",
        },
        "classes": {
            "risc_cardiovascular": {0: "Normal Risk",           1: "High Risk"},
            "boala_renala":        {0: "Healthy Kidney",        1: "Kidney Disease"},
            "diabet":              {0: "Normal Glucose",        1: "Prediabetes",       2: "Diabetes"},
            "sindrom_metabolic":   {0: "No Metabolic Syndrome", 1: "Metabolic Syndrome"},
            "hipertensiune":       {0: "Normal BP",             1: "Hypertension"},
            "steatoza_hepatica":   {0: "Healthy Liver",         1: "Fatty Liver"},
            "dislipidemie":        {0: "Normal Lipids",         1: "Dyslipidemia"},
            "anemie":              {0: "Normal Hemoglobin",     1: "Anemia"},
        },
        "markers": {
            "hba1c":              "HbA1c",
            "fasting_glucose":    "Fasting Glucose",
            "ldl":                "LDL Cholesterol",
            "total_cholesterol":  "Total Cholesterol",
            "triglycerides":      "Triglycerides",
            "hdl":                "HDL Cholesterol",
            "systolic_bp":        "Systolic BP",
            "diastolic_bp":       "Diastolic BP",
            "bmi":                "BMI",
            "waist_circumference":"Waist Circumference",
            "hemoglobin":         "Hemoglobin",
            "mcv":                "MCV",
            "ferritin":           "Ferritin",
            "alt":                "ALT",
            "ast":                "AST",
            "ggt":                "GGT",
            "crp":                "CRP",
            "creatinine":         "Creatinine",
            "urea":               "Urea",
            "uacr":               "UACR",
            "uric_acid":          "Uric Acid",
            "vitamin_d":          "Vitamin D",
            "folate":             "Folate",
            "smoker_status":      "Smoker Status",
            "sex":                "Sex",
            "age":                "Age",
        },
    },
}

# Clinical reference ranges (mirrors medicalStandards.ts)
_REFERENCE_RANGES: dict[str, str] = {
    "hba1c":               "< 5.7 %",
    "fasting_glucose":     "< 100 mg/dL",
    "ldl":                 "< 100 mg/dL",
    "total_cholesterol":   "< 200 mg/dL",
    "triglycerides":       "< 150 mg/dL",
    "hdl":                 "> 40 (M) / > 50 (F) mg/dL",
    "systolic_bp":         "< 130 mmHg",
    "diastolic_bp":        "< 85 mmHg",
    "bmi":                 "18.5 - 24.9",
    "waist_circumference": "< 102 (M) / < 88 (F) cm",
    "hemoglobin":          "> 13.0 (M) / > 12.0 (F) g/dL",
    "mcv":                 "80 - 100 fL",
    "ferritin":            "30-300 (M) / 15-200 (F) ng/mL",
    "alt":                 "< 40 U/L",
    "ast":                 "< 40 U/L",
    "ggt":                 "< 60 U/L",
    "crp":                 "< 3.0 mg/L",
    "creatinine":          "< 1.3 (M) / < 1.0 (F) mg/dL",
    "urea":                "< 50 mg/dL",
    "uacr":                "< 30 mg/g",
    "uric_acid":           "< 7.0 (M) / < 6.0 (F) mg/dL",
    "vitamin_d":           "> 30 ng/mL",
    "folate":              "> 4.0 ng/mL",
    "smoker_status":       "0 = non-smoker",
    "sex":                 "1 = M, 2 = F",
    "age":                 "years",
}

_C_PRIMARY  = (46,  61,  36)  
_C_ACCENT   = (57,  115, 103)  
_C_OXBLOOD  = (94,  10,  10)   
_C_CHAMPAGNE= (247, 231, 206)  
_C_HIGH     = (190, 50,  50)   
_C_MEDIUM   = (180, 120, 0)    
_C_LOW      = (40,  120, 70)   
_C_WHITE    = (255, 255, 255)
_C_GRAY     = (110, 110, 110)
_C_ROW_ALT  = (242, 242, 238)  

_FONT_CANDIDATES = [
    Path("C:/Windows/Fonts/segoeui.ttf"),
    Path("C:/Windows/Fonts/arial.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
]


def _risk_color(probability: float) -> tuple[int, int, int]:
    if probability >= 0.7:
        return _C_HIGH
    if probability >= 0.4:
        return _C_MEDIUM
    return _C_LOW


def _score_band(score: int, labels: dict) -> str:
    if score >= 67:
        return labels["health_score_low"]
    if score >= 34:
        return labels["health_score_medium"]
    return labels["health_score_high"]


class _ReportPDF(FPDF):
    """fpdf2 subclass that owns footer rendering."""

    def __init__(self, font_family: str, labels: dict, generated_at: str, **kwargs):
        super().__init__(**kwargs)
        self._font_family = font_family
        self._labels = labels
        self._generated_at = generated_at

    def footer(self):
        self.set_y(-14)
        self.set_font(self._font_family, size=7)
        self.set_text_color(*_C_GRAY)
        self.cell(0, 4, self._labels["footer"], align="L")
        self.set_y(-10)
        self.cell(
            0, 4,
            f"{self._labels['page']} {self.page_no()} | {self._generated_at}",
            align="R",
        )


class ReportService:
    """Stateless service that builds a PDF report from a prediction result."""

    def generate(self, prediction_data: dict, language: str = "ro") -> bytes:
        """Return PDF bytes for the given prediction."""
        lang = language if language in _LABELS else "ro"
        labels = _LABELS[lang]
        generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")

        font_family = self._load_font_candidate()

        pdf = _ReportPDF(
            font_family=font_family,
            labels=labels,
            generated_at=generated_at,
            orientation="P", unit="mm", format="A4",
        )
        if font_family != "Helvetica":
            pdf.add_font(font_family, fname=str(self._found_font_path))

        pdf.set_margins(left=15, top=15, right=15)
        pdf.set_auto_page_break(auto=True, margin=20)
        pdf.add_page()

        self._section_header_bar(pdf, prediction_data, labels, font_family, generated_at)
        self._section_health_score(pdf, prediction_data.get("health_score", 0), labels, font_family)
        self._section_risk_table(pdf, prediction_data.get("metrics", {}), labels, font_family)
        self._section_markers_table(pdf, prediction_data.get("raw_markers", {}), labels, font_family)

        buf = BytesIO()
        pdf.output(buf)
        return buf.getvalue()

    def generate_plan_pdf(self, plan: dict, language: str = "ro") -> bytes:
        """Return PDF bytes for a single plan message."""
        lang = language if language in _LABELS else "ro"
        labels = _LABELS[lang]
        plan_labels = labels["plan"]
        generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")

        font_family = self._load_font_candidate()

        plan_footer_labels = {**labels, "footer": plan_labels["footer"]}
        pdf = _ReportPDF(
            font_family=font_family,
            labels=plan_footer_labels,
            generated_at=generated_at,
            orientation="P", unit="mm", format="A4",
        )
        if font_family != "Helvetica":
            pdf.add_font(font_family, fname=str(self._found_font_path))

        pdf.set_margins(left=15, top=15, right=15)
        pdf.set_auto_page_break(auto=True, margin=20)
        pdf.add_page()

        plan_type = plan.get("plan_type", "")
        if "MEAL" in plan_type:
            type_label = plan_labels["meal_plan_label"]
        else:
            type_label = plan_labels["workout_plan_label"]

        pdf.set_fill_color(*_C_PRIMARY)
        pdf.set_text_color(*_C_CHAMPAGNE)
        pdf.set_font(font_family, size=15)
        pdf.cell(0, 12, f"  HealthMonitor  |  {type_label}", fill=True, ln=True)

        pdf.ln(3)
        pdf.set_font(font_family, size=9)
        pdf.set_text_color(*_C_PRIMARY)

        sent_at_raw = plan.get("sent_at", "")
        try:
            sent_date = datetime.fromisoformat(sent_at_raw).strftime("%Y-%m-%d")
        except Exception:
            sent_date = sent_at_raw

        col = 90
        pdf.cell(col, 5, f"{plan_labels['sent_by']}: {plan.get('sender_name', '-')}")
        pdf.cell(0,   5, f"{plan_labels['sent_on']}: {sent_date}", ln=True)

        pdf.ln(2)
        pdf.set_fill_color(*_C_CHAMPAGNE)
        pdf.set_text_color(*_C_OXBLOOD)
        pdf.set_font(font_family, size=8)
        pdf.multi_cell(0, 5, plan_labels["disclaimer"], border=1, fill=True, align="L")
        pdf.ln(5)

        pdf.set_font(font_family, size=14)
        pdf.set_text_color(*_C_PRIMARY)
        pdf.multi_cell(0, 8, plan.get("title", ""), align="L")
        pdf.ln(4)

        self._heading(pdf, plan_labels["content_title"], font_family)
        pdf.set_font(font_family, size=10)
        pdf.set_text_color(*_C_PRIMARY)
        for paragraph in plan.get("content", "").split("\n"):
            pdf.multi_cell(0, 6, paragraph, align="L", new_x="LMARGIN", new_y="NEXT")

        buf = BytesIO()
        pdf.output(buf)
        return buf.getvalue()

    def _load_font_candidate(self) -> str:
        for path in _FONT_CANDIDATES:
            if path.exists():
                self._found_font_path = path
                return "UniFont"
        self._found_font_path = None
        return "Helvetica"

    def _section_header_bar(
        self, pdf: FPDF, data: dict, labels: dict, font: str, generated_at: str,
    ):
        pdf.set_fill_color(*_C_PRIMARY)
        pdf.set_text_color(*_C_CHAMPAGNE)
        pdf.set_font(font, size=15)
        pdf.cell(0, 12, f"  HealthMonitor  |  {labels['title']}", fill=True, ln=True)

        pdf.ln(3)
        pdf.set_font(font, size=9)
        pdf.set_text_color(*_C_PRIMARY)

        name = (
            f"{data.get('patient_first_name', '')} {data.get('patient_last_name', '')}".strip()
            or "-"
        )
        col = 60
        pdf.cell(col, 5, f"{labels['patient']}: {name}")
        pdf.cell(col, 5, f"{labels['record_date']}: {data.get('record_date', '-')}")
        pdf.cell(0,   5, f"{labels['generated_at']}: {generated_at}", ln=True)

        pdf.ln(2)
        pdf.set_fill_color(*_C_CHAMPAGNE)
        pdf.set_text_color(*_C_OXBLOOD)
        pdf.set_font(font, size=8)
        pdf.multi_cell(0, 5, labels["disclaimer"], border=1, fill=True, align="L")
        pdf.ln(5)

    def _section_health_score(self, pdf: FPDF, score: int, labels: dict, font: str):
        self._heading(pdf, labels["health_score_title"], font)

        color = _risk_color(1.0 - score / 100.0)
        pdf.set_font(font, size=36)
        pdf.set_text_color(*color)
        pdf.cell(0, 16, str(score), align="C", ln=True)

        pdf.set_font(font, size=11)
        pdf.cell(0, 6, _score_band(score, labels), align="C", ln=True)
        pdf.ln(6)

    def _section_risk_table(self, pdf: FPDF, metrics: dict, labels: dict, font: str):
        if not metrics:
            return
        self._heading(pdf, labels["risk_table_title"], font)

        col_w = [74, 24, 52, 30]
        headers = [
            labels["risk_col_condition"],
            labels["risk_col_prob"],
            labels["risk_col_label"],
            labels["risk_col_level"],
        ]
        self._table_header_row(pdf, headers, col_w, font, _C_PRIMARY)

        sorted_rows = sorted(
            metrics.items(),
            key=lambda kv: kv[1].get("probability") or 0,
            reverse=True,
        )

        for idx, (slug, data) in enumerate(sorted_rows):
            prob = data.get("probability")
            if prob is None:
                continue

            rc = _risk_color(prob)
            level_key = "high" if prob >= 0.7 else ("medium" if prob >= 0.4 else "low")
            fill = _C_ROW_ALT if idx % 2 == 0 else _C_WHITE

            pdf.set_fill_color(*fill)
            pdf.set_font(font, size=9)

            pdf.set_text_color(*_C_PRIMARY)
            pdf.cell(col_w[0], 6, labels["conditions"].get(slug, slug), border=1, fill=True)

            predicted_class = data.get("predicted_class")
            class_label = (
                labels["classes"].get(slug, {}).get(predicted_class)
                or data.get("label")
                or "-"
            )

            pdf.set_text_color(*rc)
            pdf.cell(col_w[1], 6, f"{round(prob * 100)}%", border=1, fill=True, align="C")
            pdf.cell(col_w[2], 6, class_label,              border=1, fill=True, align="C")
            pdf.cell(col_w[3], 6, labels["risk_levels"][level_key], border=1, fill=True, align="C")
            pdf.ln()

        pdf.ln(5)

    def _section_markers_table(self, pdf: FPDF, raw_markers: dict, labels: dict, font: str):
        submitted = {k: v for k, v in raw_markers.items() if v is not None}
        if not submitted:
            return
        self._heading(pdf, labels["markers_table_title"], font)

        col_w = [68, 32, 80]
        headers = [
            labels["markers_col_name"],
            labels["markers_col_value"],
            labels["markers_col_ref"],
        ]
        self._table_header_row(pdf, headers, col_w, font, _C_ACCENT)

        marker_labels = labels["markers"]
        for idx, (key, value) in enumerate(submitted.items()):
            fill = _C_ROW_ALT if idx % 2 == 0 else _C_WHITE
            pdf.set_fill_color(*fill)
            pdf.set_text_color(*_C_PRIMARY)
            pdf.set_font(font, size=9)

            val_str = f"{value:.2f}" if isinstance(value, float) else str(value)
            pdf.cell(col_w[0], 6, marker_labels.get(key, key),       border=1, fill=True)
            pdf.cell(col_w[1], 6, val_str,                            border=1, fill=True, align="C")
            pdf.cell(col_w[2], 6, _REFERENCE_RANGES.get(key, "-"),   border=1, fill=True, align="C")
            pdf.ln()

    def _heading(self, pdf: FPDF, title: str, font: str):
        pdf.set_fill_color(*_C_ACCENT)
        pdf.set_text_color(*_C_WHITE)
        pdf.set_font(font, size=10)
        pdf.cell(0, 7, f"  {title}", fill=True, ln=True)
        pdf.set_text_color(*_C_PRIMARY)
        pdf.ln(2)

    def _table_header_row(
        self, pdf: FPDF, headers: list[str], col_w: list[int], font: str,
        bg_color: tuple[int, int, int],
    ):
        pdf.set_fill_color(*bg_color)
        pdf.set_text_color(*_C_WHITE)
        pdf.set_font(font, size=9)
        for i, h in enumerate(headers):
            pdf.cell(col_w[i], 7, h, border=1, fill=True, align="C")
        pdf.ln()
