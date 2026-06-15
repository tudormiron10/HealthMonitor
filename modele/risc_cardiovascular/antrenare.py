"""
=============================================================================
CREARE TARGET + ANTRENARE: RISC CARDIOVASCULAR (Framingham 2008)
=============================================================================
Clasificare binara: 0=Risc scazut (<10%), 1=Risc crescut (>=10%)

Target calculat cu Framingham General CVD Risk Score (10 ani).
Formula D'Agostino et al. (2008), Circulation:
  Risk = 1 - S0^exp(individual_sum - mean_coefficient_sum)

Variabile folosite in formula:
  - Varsta (ln), Colesterol_Total (ln), Colesterol_HDL (ln)
  - Tensiune_Sistolica (ln, cu factor tratat/netratat)
  - Status_Fumator (binar), Diabet (binar)

Coeficienti separati pe sex (barbati vs femei).
Aplicabil pentru varste 30-74 ani.

Doua variante:
  Model A: Cu componentele Framingham (ColTotal, HDL, TAS)
  Model B: Fara componentele Framingham (predictie din alti markeri)
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
FISIER_CVD = get_dataset_path('Dataset_Risc_Cardiovascular.csv')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rezultate')
TARGET_COL = 'Target_Risc_CVD'

CLASE = {0: 'Risc scazut', 1: 'Risc crescut'}

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

# Direct Framingham formula components (leakage for Model B)
# Varsta, Sex, Status_Fumator are general — kept in Model B
COLS_LEAKAGE = [
    'Colesterol_Total', 'Colesterol_HDL',
    'Tensiune_Sistolica', 'Tensiune_Diastolica',
]

# Risk threshold (AHA/ACC classification)
RISK_THRESHOLD = 10  # 10% = boundary between low and elevated



# Coefficients: D'Agostino et al. (2008), Table 4
# Male coefficients
COEF_M = {
    'ln_age': 3.06117,
    'ln_col_total': 1.12370,
    'ln_hdl': -0.93263,
    'ln_sbp_untreated': 1.93303,
    'ln_sbp_treated': 1.99881,
    'smoking': 0.65451,
    'diabetes': 0.57367,
}
MEAN_COEF_M = 23.9802
BASELINE_SURV_M = 0.88936

# Female coefficients
COEF_F = {
    'ln_age': 2.32888,
    'ln_col_total': 1.20904,
    'ln_hdl': -0.70833,
    'ln_sbp_untreated': 2.76157,
    'ln_sbp_treated': 2.82263,
    'smoking': 0.52873,
    'diabetes': 0.69154,
}
MEAN_COEF_F = 26.1931
BASELINE_SURV_F = 0.95012


def calculeaza_framingham(df):
    """
    Compute Framingham 10-year CVD risk for each patient.

    Returns:
        numpy array of risk percentages (0-100)
    """
    risk = np.zeros(len(df))

    for sex_code, label, coef, mean_c, s0 in [
        (1, 'Male', COEF_M, MEAN_COEF_M, BASELINE_SURV_M),
        (2, 'Female', COEF_F, MEAN_COEF_F, BASELINE_SURV_F),
    ]:
        mask = df['Sex'] == sex_code
        if mask.sum() == 0:
            continue

        sub = df[mask]

        # Determine if "treated" for hypertension
        # Use Target_Hipertensiune as proxy (1 = diagnosed = likely treated)
        hta = sub['Target_Hipertensiune'].fillna(0).astype(int)

        individual_sum = (
            coef['ln_age'] * np.log(sub['Varsta'].values)
            + coef['ln_col_total'] * np.log(sub['Colesterol_Total'].values)
            + coef['ln_hdl'] * np.log(sub['Colesterol_HDL'].values)
            + np.where(hta == 1,
                       coef['ln_sbp_treated'] * np.log(sub['Tensiune_Sistolica'].values),
                       coef['ln_sbp_untreated'] * np.log(sub['Tensiune_Sistolica'].values))
            + coef['smoking'] * (sub['Status_Fumator'] == 1).astype(int).values
            + coef['diabetes'] * (sub['Target_Diabet'] == 2).astype(int).values
        )

        # Risk = 1 - S0^exp(individual_sum - mean_coefficient_sum)
        risk_pct = (1 - s0 ** np.exp(individual_sum - mean_c)) * 100
        risk_pct = np.clip(risk_pct, 0, 100)
        risk[mask] = risk_pct

    return risk


def creeaza_target_cvd():
    """
    Compute CVD risk target from Framingham 2008 formula.
    Restricted to ages 30-74 (formula validity range).
    """
    if os.path.exists(FISIER_CVD):
        print(f"Dataset CVD deja existent: {FISIER_CVD}")
        return

    print("Creare Target Risc Cardiovascular (Framingham 2008)...")
    df = pd.read_csv(FISIER_INPUT)

    # Framingham requires specific columns to be non-null
    cols_needed = ['Varsta', 'Sex', 'Colesterol_Total', 'Colesterol_HDL',
                   'Tensiune_Sistolica']
    mask_complet = df[cols_needed].notna().all(axis=1)

    # Positive values required for log
    mask_pozitiv = ((df['Colesterol_Total'] > 0) &
                    (df['Colesterol_HDL'] > 0) &
                    (df['Tensiune_Sistolica'] > 0))

    # Age range 30-74 (formula validity)
    mask_varsta = (df['Varsta'] >= 30) & (df['Varsta'] <= 74)

    mask_valid = mask_complet & mask_pozitiv & mask_varsta
    n_valid = mask_valid.sum()
    n_excl = len(df) - n_valid
    print(f"   Pacienti eligibili (30-74 ani, date complete): {n_valid:,} / {len(df):,}")
    print(f"   Exclusi: {n_excl:,} (varsta <30/>74 sau valori lipsa)")

    df_valid = df[mask_valid].copy()

    # Compute Framingham risk
    df_valid['Risc_CVD_Pct'] = calculeaza_framingham(df_valid)

    # Distribution report
    print(f"\n   Distributia Risc CVD (%):")
    print(f"   Mean: {df_valid['Risc_CVD_Pct'].mean():.1f}% | "
          f"Median: {df_valid['Risc_CVD_Pct'].median():.1f}%")
    print(f"   Min:  {df_valid['Risc_CVD_Pct'].min():.1f}% | "
          f"Max: {df_valid['Risc_CVD_Pct'].max():.1f}%")

    # Risk categories
    low = (df_valid['Risc_CVD_Pct'] < 10).sum()
    moderate = ((df_valid['Risc_CVD_Pct'] >= 10) & (df_valid['Risc_CVD_Pct'] < 20)).sum()
    high = (df_valid['Risc_CVD_Pct'] >= 20).sum()
    total = len(df_valid)

    print(f"\n   Categorii risc (AHA/ACC):")
    print(f"   < 10% (risc scazut):      {low:5d} ({low/total*100:.1f}%)")
    print(f"   10-20% (risc moderat):    {moderate:5d} ({moderate/total*100:.1f}%)")
    print(f"   > 20% (risc crescut):     {high:5d} ({high/total*100:.1f}%)")

    # Binary target
    df_valid['Target_Risc_CVD'] = (df_valid['Risc_CVD_Pct'] >= RISK_THRESHOLD).astype(int)

    ckd_pos = df_valid['Target_Risc_CVD'].sum()
    ckd_neg = total - ckd_pos
    print(f"\n   Target binar (prag {RISK_THRESHOLD}%):")
    print(f"   0 (Risc scazut):    {ckd_neg:5d} ({ckd_neg/total*100:.1f}%)")
    print(f"   1 (Risc crescut):   {ckd_pos:5d} ({ckd_pos/total*100:.1f}%)")

    # By sex
    for sex_code, label in [(1, 'Barbati'), (2, 'Femei')]:
        sub = df_valid[df_valid['Sex'] == sex_code]
        elevated = sub['Target_Risc_CVD'].sum()
        print(f"   {label}: {elevated}/{len(sub)} risc crescut "
              f"({elevated/len(sub)*100:.1f}%), mean risk={sub['Risc_CVD_Pct'].mean():.1f}%")

    df_valid.to_csv(FISIER_CVD, index=False)
    print(f"\n   Salvat: {FISIER_CVD}")



def main():
    print("=" * 65)
    print("PIPELINE ML — PREDICTIA RISCULUI CARDIOVASCULAR")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    # Step 0: Create target if needed
    creeaza_target_cvd()

    # Load data
    df, y = incarca_date(FISIER_CVD, TARGET_COL, CLASE)

    # Model A: all features (including Framingham components)
    rez_A = ruleaza_pipeline(
        'ModelA', TOTI_PREDICTORII, df, y, CLASE, OUTPUT_DIR,
        target_name='Risc_Cardiovascular', cmap='YlOrRd'
    )

    # Model B: without direct Framingham components
    # Keeps: Varsta, Sex, Status_Fumator (general risk factors)
    # Removes: Colesterol_Total, HDL, Tensiune_Sistolica/Diastolica
    predictori_B = [p for p in TOTI_PREDICTORII if p not in COLS_LEAKAGE]
    rez_B = ruleaza_pipeline(
        'ModelB', predictori_B, df, y, CLASE, OUTPUT_DIR,
        target_name='Risc_Cardiovascular', cmap='YlOrRd'
    )

    afiseaza_tabel_comparativ(rez_A + rez_B, OUTPUT_DIR, 'comparatie_modele_cvd.csv')

    for var in ['ModelA', 'ModelB']:
        rez = [r for r in rez_A + rez_B if r['varianta'] == var]
        best = max(rez, key=lambda x: x['f1_macro'])
        auc = f", AUC={best['auc_roc']:.4f}" if best.get('auc_roc') else ""
        print(f"\nCel mai bun {var}: {best['model']} (F1={best['f1_macro']:.4f}{auc})")

    print(f"\n{'=' * 65}")
    print(f"Pipeline Risc Cardiovascular finalizat! Rezultate in: {OUTPUT_DIR}")
    print(f"{'=' * 65}")


if __name__ == '__main__':
    main()
