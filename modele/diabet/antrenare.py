"""ANTRENARE MODEL: PREDICTIA DIABETULUI (Sanatos / Borderline / Diabet)"""
import sys
import os
from datetime import datetime

# Add parent directory to path so we can import utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import (
    get_dataset_path, incarca_date, ruleaza_pipeline, afiseaza_tabel_comparativ
)

FISIER = get_dataset_path('Dataset_Diabet_Clean.csv')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rezultate')
TARGET_COL = 'Target_Diabet'

CLASE = {0: 'Sanatos', 1: 'Borderline', 2: 'Diabet'}

TOTI_PREDICTORII = [
    'Sex', 'Varsta', 'BMI', 'Circumferinta_Abdominala',
    'Tensiune_Sistolica', 'Tensiune_Diastolica',
    'HbA1c_Glicata', 'Glicemie_Fasting',
    'Colesterol_Total', 'Colesterol_HDL', 'Colesterol_LDL', 'Trigliceride',
    'Inflamatie_CRP', 'Ficat_ALT', 'Ficat_AST', 'Ficat_GGT',
    'Creatinina_Sange', 'Uree_Sange', 'Albumina_Urina_Ratio', 'Acid_Uric',
    'Hemoglobina', 'MCV_Volum_Eritrocitar', 'Feritina_Fier',
    'Vitamina_D', 'Folat_Acid_Folic', 'Status_Fumator',
]

# Direct diagnostic criteria (leakage for Model B)
COLS_LEAKAGE = ['HbA1c_Glicata', 'Glicemie_Fasting']

# SMOTE strategy: boost minority classes toward majority
SMOTE_STRATEGY = {1: 1500, 2: 3000}

def main():
    print("=" * 65)
    print("PIPELINE ML — PREDICTIA DIABETULUI")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    df, y = incarca_date(FISIER, TARGET_COL, CLASE)

    # Model A: all 26 features (clinical diagnosis simulation)
    predictori_A = TOTI_PREDICTORII.copy()
    rez_A = ruleaza_pipeline(
        'ModelA', predictori_A, df, y, CLASE, OUTPUT_DIR,
        target_name='Diabet', smote_strategy=SMOTE_STRATEGY, cmap='Blues'
    )

    # Model B: without HbA1c + Glicemie (risk factors only — for web app)
    predictori_B = [p for p in TOTI_PREDICTORII if p not in COLS_LEAKAGE]
    rez_B = ruleaza_pipeline(
        'ModelB', predictori_B, df, y, CLASE, OUTPUT_DIR,
        target_name='Diabet', smote_strategy=SMOTE_STRATEGY, cmap='Blues'
    )

    afiseaza_tabel_comparativ(rez_A + rez_B, OUTPUT_DIR)

    # Best per variant
    for var in ['ModelA', 'ModelB']:
        rez = [r for r in rez_A + rez_B if r['varianta'] == var]
        best = max(rez, key=lambda x: x['f1_macro'])
        print(f"\nCel mai bun {var}: {best['model']} (F1-macro={best['f1_macro']:.4f})")

    print(f"\n{'=' * 65}")
    print(f"Pipeline Diabet finalizat! Rezultate in: {OUTPUT_DIR}")
    print(f"{'=' * 65}")


if __name__ == '__main__':
    main()
