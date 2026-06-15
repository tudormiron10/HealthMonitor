"""
=============================================================================
ANTRENARE MODEL: PREDICTIA HIPERTENSIUNII ARTERIALE
=============================================================================
Clasificare binara: 0=Normo-tensiv, 1=Hipertensiune
Target: Target_Hipertensiune (preexistent in dataset, din chestionarul NHANES BPQ020)

Doua variante:
  Model A: Cu Tensiune_Sistolica/Diastolica (masuratori directe TA)
  Model B: Fara masuratorile de tensiune (predictie din alti factori de risc)
=============================================================================
"""
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import (
    get_dataset_path, incarca_date, ruleaza_pipeline, afiseaza_tabel_comparativ
)


FISIER = get_dataset_path('Dataset_Diabet_Clean.csv')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rezultate')
TARGET_COL = 'Target_Hipertensiune'

CLASE = {0: 'Normo-tensiv', 1: 'Hipertensiune'}

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

# Direct BP measurements (leakage for Model B)
COLS_LEAKAGE = ['Tensiune_Sistolica', 'Tensiune_Diastolica']



def main():
    print("=" * 65)
    print("PIPELINE ML — PREDICTIA HIPERTENSIUNII ARTERIALE")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    import pandas as pd
    # Target_Hipertensiune has NaN values (some NHANES respondents
    # did not answer the hypertension questionnaire BPQ020).
    # Filter those out and save a dedicated dataset.
    fisier_hta = get_dataset_path('Dataset_Hipertensiune.csv')
    if not os.path.exists(fisier_hta):
        df_raw = pd.read_csv(FISIER)
        n_before = len(df_raw)
        df_raw = df_raw.dropna(subset=[TARGET_COL])
        print(f"   Filtrat NaN din {TARGET_COL}: {n_before} -> {len(df_raw)} pacienti")
        df_raw.to_csv(fisier_hta, index=False)

    df, y = incarca_date(fisier_hta, TARGET_COL, CLASE)

    # Model A: all features (including BP measurements)
    rez_A = ruleaza_pipeline(
        'ModelA', TOTI_PREDICTORII, df, y, CLASE, OUTPUT_DIR,
        target_name='Hipertensiune', cmap='Reds'
    )

    # Model B: without BP measurements (risk factor prediction)
    predictori_B = [p for p in TOTI_PREDICTORII if p not in COLS_LEAKAGE]
    rez_B = ruleaza_pipeline(
        'ModelB', predictori_B, df, y, CLASE, OUTPUT_DIR,
        target_name='Hipertensiune', cmap='Reds'
    )

    afiseaza_tabel_comparativ(rez_A + rez_B, OUTPUT_DIR, 'comparatie_modele_hta.csv')

    for var in ['ModelA', 'ModelB']:
        rez = [r for r in rez_A + rez_B if r['varianta'] == var]
        best = max(rez, key=lambda x: x['f1_macro'])
        auc = f", AUC={best['auc_roc']:.4f}" if best.get('auc_roc') else ""
        print(f"\nCel mai bun {var}: {best['model']} (F1={best['f1_macro']:.4f}{auc})")

    print(f"\n{'=' * 65}")
    print(f"Pipeline Hipertensiune finalizat! Rezultate in: {OUTPUT_DIR}")
    print(f"{'=' * 65}")


if __name__ == '__main__':
    main()
