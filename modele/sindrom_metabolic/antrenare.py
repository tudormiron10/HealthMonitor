"""
=============================================================================
CREARE TARGET + ANTRENARE: SINDROM METABOLIC (IDF / NCEP ATP III)
=============================================================================
Clasificare binara: 0=Fara SM, 1=Sindrom Metabolic
Target calculat din >= 3 din 5 criterii clinice (gender-aware)
Doua variante: Model A (cu criteriile), Model B (fara criteriile)
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
FISIER_SM = get_dataset_path('Dataset_Sindrom_Metabolic.csv')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rezultate')
TARGET_COL = 'Target_Sindrom_Metabolic'

CLASE = {0: 'Fara SM', 1: 'Sindrom Metabolic'}

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

# Features that ARE the SM criteria definition (leakage for Model B)
COLS_CRITERII = [
    'Circumferinta_Abdominala', 'Trigliceride', 'Colesterol_HDL',
    'Tensiune_Sistolica', 'Tensiune_Diastolica', 'Glicemie_Fasting',
]



def creeaza_target_sm():
    """
    Compute Metabolic Syndrome target from IDF/NCEP ATP III criteria.
    SM = 1 if >= 3 of 5 criteria are met (gender-aware thresholds).
    Only patients with ALL 5 criteria evaluable are included.
    """
    # Check if SM dataset already exists
    if os.path.exists(FISIER_SM):
        print(f"Dataset SM deja existent: {FISIER_SM}")
        return

    print("Creare Target Sindrom Metabolic din criterii IDF/NCEP ATP III...")
    df = pd.read_csv(FISIER_INPUT)

    # Only keep patients with all criteria evaluable
    cols_needed = ['Sex', 'Circumferinta_Abdominala', 'Trigliceride',
                   'Colesterol_HDL', 'Tensiune_Sistolica', 'Tensiune_Diastolica',
                   'Glicemie_Fasting']
    mask = df[cols_needed].notna().all(axis=1)
    df = df[mask].copy()

    # Criterion 1: Waist >= 102 (M) / >= 88 (F)
    c1 = np.where(df['Sex'] == 1,
                  (df['Circumferinta_Abdominala'] >= 102).astype(int),
                  (df['Circumferinta_Abdominala'] >= 88).astype(int))

    # Criterion 2: Triglycerides >= 150
    c2 = (df['Trigliceride'] >= 150).astype(int)

    # Criterion 3: HDL < 40 (M) / < 50 (F)
    c3 = np.where(df['Sex'] == 1,
                  (df['Colesterol_HDL'] < 40).astype(int),
                  (df['Colesterol_HDL'] < 50).astype(int))

    # Criterion 4: BP >= 130/85
    c4 = ((df['Tensiune_Sistolica'] >= 130) | (df['Tensiune_Diastolica'] >= 85)).astype(int)

    # Criterion 5: Fasting glucose >= 100
    c5 = (df['Glicemie_Fasting'] >= 100).astype(int)

    # Total criteria met and binary target
    df['Nr_Criterii_SM'] = c1 + c2 + c3 + c4 + c5
    df['Target_Sindrom_Metabolic'] = (df['Nr_Criterii_SM'] >= 3).astype(int)

    # Report
    total = len(df)
    sm_pos = df['Target_Sindrom_Metabolic'].sum()
    print(f"   Pacienti evaluabili: {total:,}")
    print(f"   Fara SM:  {total - sm_pos:,} ({(total - sm_pos)/total*100:.1f}%)")
    print(f"   Cu SM:    {sm_pos:,} ({sm_pos/total*100:.1f}%)")

    df.to_csv(FISIER_SM, index=False)
    print(f"   Salvat: {FISIER_SM}")



def main():
    print("=" * 65)
    print("PIPELINE ML — PREDICTIA SINDROMULUI METABOLIC")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    # Step 0: Create target if needed
    creeaza_target_sm()

    # Load data
    df, y = incarca_date(FISIER_SM, TARGET_COL, CLASE)

    # Model A: all features (including criteria — verification model)
    rez_A = ruleaza_pipeline(
        'ModelA', TOTI_PREDICTORII, df, y, CLASE, OUTPUT_DIR,
        target_name='Sindrom_Metabolic', cmap='Oranges'
    )

    # Model B: without criteria measurements (prediction from other biomarkers)
    predictori_B = [p for p in TOTI_PREDICTORII if p not in COLS_CRITERII]
    rez_B = ruleaza_pipeline(
        'ModelB', predictori_B, df, y, CLASE, OUTPUT_DIR,
        target_name='Sindrom_Metabolic', cmap='Oranges'
    )

    afiseaza_tabel_comparativ(rez_A + rez_B, OUTPUT_DIR, 'comparatie_modele_sm.csv')

    for var in ['ModelA', 'ModelB']:
        rez = [r for r in rez_A + rez_B if r['varianta'] == var]
        best = max(rez, key=lambda x: x['f1_macro'])
        auc = f", AUC={best['auc_roc']:.4f}" if best.get('auc_roc') else ""
        print(f"\nCel mai bun {var}: {best['model']} (F1={best['f1_macro']:.4f}{auc})")

    print(f"\n{'=' * 65}")
    print(f"Pipeline Sindrom Metabolic finalizat! Rezultate in: {OUTPUT_DIR}")
    print(f"{'=' * 65}")


if __name__ == '__main__':
    main()
