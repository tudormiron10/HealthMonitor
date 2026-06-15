"""
=============================================================================
CREARE TARGET + ANTRENARE: BOALA CRONICA DE RINICHI (CKD)
=============================================================================
Clasificare binara: 0=Functie renala normala, 1=Boala cronica de rinichi

Target calculat cu eGFR (estimated Glomerular Filtration Rate)
Formula CKD-EPI 2021 (race-free, Inker et al.):
  eGFR = 142 * min(Scr/k, 1)^a * max(Scr/k, 1)^(-1.200) * 0.9938^Age * 1.012(if F)
  k = 0.7 (F) / 0.9 (M)
  a = -0.241 (F) / -0.302 (M)

Interpretare eGFR:
  >= 90  = Normal (G1)
  60-89  = Usor scazut (G2)
  45-59  = Moderat scazut (G3a)
  30-44  = Sever scazut (G3b)
  15-29  = Foarte sever (G4)
  < 15   = Insuficienta renala (G5)

Clasificare binara:
  eGFR >= 60 = functie renala normala/usor scazuta (clasa 0)
  eGFR <  60 = boala cronica de rinichi stadiu 3-5 (clasa 1)

Referinta:
  Inker et al. (2021) — NEJM, "New Creatinine- and Cystatin C-Based
  Equations to Estimate GFR without Race"

Doua variante:
  Model A: Cu Creatinina_Sange (componenta directa a eGFR)
  Model B: Fara Creatinina_Sange (predictie din alti markeri)
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
FISIER_CKD = get_dataset_path('Dataset_Boala_Renala.csv')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rezultate')
TARGET_COL = 'Target_CKD'

CLASE = {0: 'Rinichi sanatos', 1: 'Boala renala cronica'}

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

# Direct eGFR formula component (leakage for Model B)
# Note: Varsta and Sex are also used in eGFR but are general features,
# not kidney-specific, so they stay in Model B
COLS_LEAKAGE = ['Creatinina_Sange']

# eGFR threshold for CKD diagnosis (KDIGO 2012 guidelines)
EGFR_THRESHOLD = 60


# ──────────────────────────────────────────────────────────────────────────────
# TARGET CREATION
# ──────────────────────────────────────────────────────────────────────────────
def calculeaza_egfr_ckd_epi(creatinina, varsta, sex):
    """
    Compute eGFR using CKD-EPI 2021 race-free formula.

    Args:
        creatinina: serum creatinine in mg/dL
        varsta: age in years
        sex: 1=Male, 2=Female (NHANES coding)

    Returns:
        eGFR in mL/min/1.73m2
    """
    # Parameters by sex (NHANES: 1=M, 2=F)
    kappa = np.where(sex == 2, 0.7, 0.9)
    alpha = np.where(sex == 2, -0.241, -0.302)
    sex_factor = np.where(sex == 2, 1.012, 1.0)

    # CKD-EPI 2021 formula
    scr_ratio = creatinina / kappa
    min_term = np.minimum(scr_ratio, 1.0) ** alpha
    max_term = np.maximum(scr_ratio, 1.0) ** (-1.200)
    age_term = 0.9938 ** varsta

    egfr = 142 * min_term * max_term * age_term * sex_factor
    return egfr


def creeaza_target_ckd():
    """
    Compute CKD target from eGFR.
    CKD = 1 if eGFR < 60 (KDIGO stage G3-G5).
    """
    if os.path.exists(FISIER_CKD):
        print(f"Dataset CKD deja existent: {FISIER_CKD}")
        return

    print("Creare Target Boala Renala Cronica (CKD-EPI 2021 eGFR)...")
    df = pd.read_csv(FISIER_INPUT)

    # eGFR requires Creatinina, Varsta, Sex — all non-null
    cols_needed = ['Creatinina_Sange', 'Varsta', 'Sex']
    mask = df[cols_needed].notna().all(axis=1) & (df['Creatinina_Sange'] > 0)

    n_valid = mask.sum()
    n_excl = len(df) - n_valid
    print(f"   Pacienti cu eGFR calculabil: {n_valid:,} / {len(df):,}")
    print(f"   Exclusi (valori lipsa/invalide): {n_excl:,}")

    df_valid = df[mask].copy()

    # Compute eGFR
    df_valid['eGFR'] = calculeaza_egfr_ckd_epi(
        df_valid['Creatinina_Sange'].values,
        df_valid['Varsta'].values,
        df_valid['Sex'].values
    )

    # Distribution report
    print(f"\n   Distributia eGFR:")
    print(f"   Mean: {df_valid['eGFR'].mean():.1f} | Median: {df_valid['eGFR'].median():.1f}")
    print(f"   Min:  {df_valid['eGFR'].min():.1f} | Max: {df_valid['eGFR'].max():.1f}")

    # CKD staging distribution
    stages = [
        ('G1 (eGFR >= 90, normal)',       df_valid['eGFR'] >= 90),
        ('G2 (eGFR 60-89, usor scazut)',  (df_valid['eGFR'] >= 60) & (df_valid['eGFR'] < 90)),
        ('G3a (eGFR 45-59, moderat)',      (df_valid['eGFR'] >= 45) & (df_valid['eGFR'] < 60)),
        ('G3b (eGFR 30-44, sever)',        (df_valid['eGFR'] >= 30) & (df_valid['eGFR'] < 45)),
        ('G4 (eGFR 15-29, foarte sever)',  (df_valid['eGFR'] >= 15) & (df_valid['eGFR'] < 30)),
        ('G5 (eGFR < 15, insuficienta)',   df_valid['eGFR'] < 15),
    ]

    print(f"\n   Stadii CKD (KDIGO):")
    for name, mask_stage in stages:
        cnt = mask_stage.sum()
        print(f"   {name:40s}: {cnt:5d} ({cnt/len(df_valid)*100:.1f}%)")

    # Binary target: eGFR >= 60 = 0, eGFR < 60 = 1
    df_valid['Target_CKD'] = (df_valid['eGFR'] < EGFR_THRESHOLD).astype(int)

    total = len(df_valid)
    ckd_pos = df_valid['Target_CKD'].sum()
    ckd_neg = total - ckd_pos
    print(f"\n   Target binar (prag eGFR = {EGFR_THRESHOLD}):")
    print(f"   0 (Rinichi sanatos):    {ckd_neg:5d} ({ckd_neg/total*100:.1f}%)")
    print(f"   1 (Boala renala):       {ckd_pos:5d} ({ckd_pos/total*100:.1f}%)")

    # Additional marker: albuminuria (UACR > 30 mg/g)
    if 'Albumina_Urina_Ratio' in df_valid.columns:
        alb_mask = df_valid['Albumina_Urina_Ratio'].notna()
        microalb = (df_valid.loc[alb_mask, 'Albumina_Urina_Ratio'] > 30).sum()
        print(f"\n   Microalbuminurie (UACR > 30): {microalb} / {alb_mask.sum()} "
              f"({microalb/alb_mask.sum()*100:.1f}%)")

    # Cross-tab with diabetes
    if 'Target_Diabet' in df_valid.columns:
        print(f"\n   Corelatie CKD x Diabet:")
        cross = pd.crosstab(
            df_valid['Target_CKD'].map({0: 'Rinichi sanatos', 1: 'CKD'}),
            df_valid['Target_Diabet'].map({0: 'Sanatos', 1: 'Borderline', 2: 'Diabet'}),
            margins=True
        )
        print(cross.to_string())

    df_valid.to_csv(FISIER_CKD, index=False)
    print(f"\n   Salvat: {FISIER_CKD}")


def main():
    print("=" * 65)
    print("PIPELINE ML — PREDICTIA BOLII CRONICE DE RINICHI (CKD)")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    # Step 0: Create target if needed
    creeaza_target_ckd()

    # Load data
    df, y = incarca_date(FISIER_CKD, TARGET_COL, CLASE)

    # Model A: all features (including Creatinina — eGFR component)
    rez_A = ruleaza_pipeline(
        'ModelA', TOTI_PREDICTORII, df, y, CLASE, OUTPUT_DIR,
        target_name='Boala_Renala', cmap='PuBu'
    )

    # Model B: without Creatinina_Sange (eGFR's direct input)
    # Keeps: Uree_Sange, Albumina_Urina_Ratio, Acid_Uric (kidney-relevant but not eGFR)
    predictori_B = [p for p in TOTI_PREDICTORII if p not in COLS_LEAKAGE]
    rez_B = ruleaza_pipeline(
        'ModelB', predictori_B, df, y, CLASE, OUTPUT_DIR,
        target_name='Boala_Renala', cmap='PuBu'
    )

    afiseaza_tabel_comparativ(rez_A + rez_B, OUTPUT_DIR, 'comparatie_modele_ckd.csv')

    for var in ['ModelA', 'ModelB']:
        rez = [r for r in rez_A + rez_B if r['varianta'] == var]
        best = max(rez, key=lambda x: x['f1_macro'])
        auc = f", AUC={best['auc_roc']:.4f}" if best.get('auc_roc') else ""
        print(f"\nCel mai bun {var}: {best['model']} (F1={best['f1_macro']:.4f}{auc})")

    print(f"\n{'=' * 65}")
    print(f"Pipeline Boala Renala finalizat! Rezultate in: {OUTPUT_DIR}")
    print(f"{'=' * 65}")


if __name__ == '__main__':
    main()
