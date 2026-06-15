"""
=============================================================================
CREARE TARGET + ANTRENARE: ANEMIE
=============================================================================
Clasificare binara: 0=Hemoglobina normala, 1=Anemie

Target definit pe baza pragurilor OMS (WHO) pentru hemoglobina:
  Barbati (Sex=1):  Hemoglobina < 13 g/dL = anemie
  Femei   (Sex=2):  Hemoglobina < 12 g/dL = anemie

Referinta:
  WHO (2011) — "Haemoglobin concentrations for the diagnosis of anaemia
  and assessment of severity"

Doua variante:
  Model A: Cu Hemoglobina (componenta directa a diagnosticului)
  Model B: Fara Hemoglobina (predictie din markeri metabolici + hematologici)
           Pastreaza MCV, Feritina, Folat — nu definesc anemia, dar o
           caracterizeaza (tip microcitar/macrocitar)
=============================================================================
"""
import sys
import os
import numpy as np
import pandas as pd
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import (
    get_dataset_path, incarca_date, ruleaza_pipeline, afiseaza_tabel_comparativ
)

FISIER_INPUT = get_dataset_path('Dataset_Diabet_Clean.csv')
FISIER_ANEMIE = get_dataset_path('Dataset_Anemie.csv')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rezultate')
TARGET_COL = 'Target_Anemie'

CLASE = {0: 'Hemoglobina normala', 1: 'Anemie'}

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

# Direct diagnostic criterion (leakage for Model B)
# Hemoglobina IS the definition of anemia
# MCV and Feritina are kept — they characterize type, not define anemia
COLS_LEAKAGE = ['Hemoglobina']


# ──────────────────────────────────────────────────────────────────────────────
# TARGET CREATION
# ──────────────────────────────────────────────────────────────────────────────
def creeaza_target_anemie():
    """
    Compute Anemia target from WHO hemoglobin thresholds.
    Gender-aware: M < 13 g/dL, F < 12 g/dL.
    """
    if os.path.exists(FISIER_ANEMIE):
        print(f"Dataset Anemie deja existent: {FISIER_ANEMIE}")
        return

    print("Creare Target Anemie (praguri OMS / WHO)...")
    df = pd.read_csv(FISIER_INPUT)

    # Hemoglobina and Sex must be non-null
    mask = df[['Hemoglobina', 'Sex']].notna().all(axis=1)
    n_valid = mask.sum()
    print(f"   Pacienti cu Hemoglobina disponibila: {n_valid:,} / {len(df):,}")

    df_valid = df[mask].copy()

    # Gender-aware thresholds (WHO 2011)
    df_valid['Target_Anemie'] = np.where(
        df_valid['Sex'] == 1,
        (df_valid['Hemoglobina'] < 13).astype(int),   # Male threshold
        (df_valid['Hemoglobina'] < 12).astype(int)    # Female threshold
    )

    # Distribution report
    total = len(df_valid)
    anemic = df_valid['Target_Anemie'].sum()
    normal = total - anemic

    print(f"\n   Distributia Hemoglobina:")
    print(f"   Mean: {df_valid['Hemoglobina'].mean():.1f} g/dL | "
          f"Median: {df_valid['Hemoglobina'].median():.1f}")
    for sex, label in [(1, 'Barbati'), (2, 'Femei')]:
        subset = df_valid[df_valid['Sex'] == sex]
        an = subset['Target_Anemie'].sum()
        print(f"   {label}: mean Hb={subset['Hemoglobina'].mean():.1f}, "
              f"anemic={an}/{len(subset)} ({an/len(subset)*100:.1f}%)")

    print(f"\n   Target binar:")
    print(f"   0 (Hb normala): {normal:5d} ({normal/total*100:.1f}%)")
    print(f"   1 (Anemie):     {anemic:5d} ({anemic/total*100:.1f}%)")

    # MCV-based anemia subtypes (informative)
    anemic_df = df_valid[df_valid['Target_Anemie'] == 1]
    if 'MCV_Volum_Eritrocitar' in anemic_df.columns:
        mcv_valid = anemic_df['MCV_Volum_Eritrocitar'].notna()
        micro = (anemic_df.loc[mcv_valid, 'MCV_Volum_Eritrocitar'] < 80).sum()
        normo = ((anemic_df.loc[mcv_valid, 'MCV_Volum_Eritrocitar'] >= 80) &
                 (anemic_df.loc[mcv_valid, 'MCV_Volum_Eritrocitar'] <= 100)).sum()
        macro = (anemic_df.loc[mcv_valid, 'MCV_Volum_Eritrocitar'] > 100).sum()
        print(f"\n   Subtipuri anemie (dupa MCV, din {mcv_valid.sum()} anemici):")
        print(f"   Microcitara (MCV<80):   {micro:4d} ({micro/mcv_valid.sum()*100:.1f}%)")
        print(f"   Normocitara (80-100):   {normo:4d} ({normo/mcv_valid.sum()*100:.1f}%)")
        print(f"   Macrocitara (MCV>100):  {macro:4d} ({macro/mcv_valid.sum()*100:.1f}%)")

    df_valid.to_csv(FISIER_ANEMIE, index=False)
    print(f"\n   Salvat: {FISIER_ANEMIE}")


def main():
    print("=" * 65)
    print("PIPELINE ML — PREDICTIA ANEMIEI")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    # Step 0: Create target if needed
    creeaza_target_anemie()

    # Load data
    df, y = incarca_date(FISIER_ANEMIE, TARGET_COL, CLASE)

    # Model A: all features (including Hemoglobina — direct diagnostic)
    rez_A = ruleaza_pipeline(
        'ModelA', TOTI_PREDICTORII, df, y, CLASE, OUTPUT_DIR,
        target_name='Anemie', cmap='RdYlGn_r'
    )

    # Model B: without Hemoglobina (can metabolic markers predict anemia?)
    # Keeps MCV, Feritina, Folat — they characterize anemia type, not define it
    predictori_B = [p for p in TOTI_PREDICTORII if p not in COLS_LEAKAGE]
    rez_B = ruleaza_pipeline(
        'ModelB', predictori_B, df, y, CLASE, OUTPUT_DIR,
        target_name='Anemie', cmap='RdYlGn_r'
    )

    afiseaza_tabel_comparativ(rez_A + rez_B, OUTPUT_DIR, 'comparatie_modele_anemie.csv')

    for var in ['ModelA', 'ModelB']:
        rez = [r for r in rez_A + rez_B if r['varianta'] == var]
        best = max(rez, key=lambda x: x['f1_macro'])
        auc = f", AUC={best['auc_roc']:.4f}" if best.get('auc_roc') else ""
        print(f"\nCel mai bun {var}: {best['model']} (F1={best['f1_macro']:.4f}{auc})")

    print(f"\n{'=' * 65}")
    print(f"Pipeline Anemie finalizat! Rezultate in: {OUTPUT_DIR}")
    print(f"{'=' * 65}")


if __name__ == '__main__':
    main()
