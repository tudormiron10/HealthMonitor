"""
=============================================================================
CREARE TARGET + ANTRENARE: STEATOZA HEPATICA (NAFLD)
=============================================================================
Clasificare binara: 0=Ficat sanatos, 1=Steatoza hepatica

Target calculat cu Fatty Liver Index (FLI) — scor validat clinic:
  FLI = (e^L / (1 + e^L)) * 100
  unde L = 0.953*ln(Trigliceride) + 0.139*BMI + 0.718*ln(GGT) + 0.053*Circumf - 15.745

Interpretare FLI:
  < 30  = Steatoza exclusa (clasa 0)
  30-59 = Zona incerta (pacienti exclusi din antrenare)
  >= 60 = Steatoza probabila (clasa 1)

Referinta:
  Bedogni et al. (2006) — Hepatology, "The Fatty Liver Index"

Doua variante:
  Model A: Cu componentele FLI (BMI, Trigliceride, GGT, Circumferinta)
  Model B: Fara componentele FLI (predictie din alti biomarkeri)
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
FISIER_NAFLD = get_dataset_path('Dataset_Steatoza_Hepatica.csv')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rezultate')
TARGET_COL = 'Target_Steatoza'

CLASE = {0: 'Ficat sanatos', 1: 'Steatoza hepatica'}

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

# FLI formula components (leakage for Model B)
COLS_FLI = ['BMI', 'Trigliceride', 'Ficat_GGT', 'Circumferinta_Abdominala']

# FLI thresholds (Bedogni et al., 2006)
FLI_THRESHOLD_LOW = 30   # below = no steatosis
FLI_THRESHOLD_HIGH = 60  # above = steatosis probable



def calculeaza_fli(df):
    """
    Compute Fatty Liver Index for each patient.

    Formula (Bedogni et al., 2006):
      L = 0.953*ln(TG) + 0.139*BMI + 0.718*ln(GGT) + 0.053*WC - 15.745
      FLI = (e^L / (1 + e^L)) * 100

    Returns a Series with FLI scores (0-100).
    """
    L = (0.953 * np.log(df['Trigliceride'])
         + 0.139 * df['BMI']
         + 0.718 * np.log(df['Ficat_GGT'])
         + 0.053 * df['Circumferinta_Abdominala']
         - 15.745)

    fli = (np.exp(L) / (1 + np.exp(L))) * 100
    return fli


def creeaza_target_nafld():
    """
    Compute NAFLD target using FLI.
    Patients in the uncertain zone (FLI 30-59) are excluded.
    """
    if os.path.exists(FISIER_NAFLD):
        print(f"Dataset NAFLD deja existent: {FISIER_NAFLD}")
        return

    print("Creare Target Steatoza Hepatica (Fatty Liver Index)...")
    df = pd.read_csv(FISIER_INPUT)

    # FLI requires all 4 components to be non-null
    cols_needed = ['BMI', 'Trigliceride', 'Ficat_GGT', 'Circumferinta_Abdominala']
    mask_complet = df[cols_needed].notna().all(axis=1)

    # Also need positive values for log (TG and GGT must be > 0)
    mask_pozitiv = (df['Trigliceride'] > 0) & (df['Ficat_GGT'] > 0)
    mask_valid = mask_complet & mask_pozitiv

    n_valid = mask_valid.sum()
    n_excl = len(df) - n_valid
    print(f"   Pacienti cu FLI calculabil: {n_valid:,} / {len(df):,}")
    print(f"   Exclusi (valori lipsa/invalide): {n_excl:,}")

    df_valid = df[mask_valid].copy()

    # Compute FLI
    df_valid['FLI'] = calculeaza_fli(df_valid)

    # Distribution report
    print(f"\n   Distributia FLI:")
    print(f"   Mean: {df_valid['FLI'].mean():.1f} | Median: {df_valid['FLI'].median():.1f}")
    print(f"   Min:  {df_valid['FLI'].min():.1f} | Max: {df_valid['FLI'].max():.1f}")

    fli_low = (df_valid['FLI'] < FLI_THRESHOLD_LOW).sum()
    fli_mid = ((df_valid['FLI'] >= FLI_THRESHOLD_LOW) & (df_valid['FLI'] < FLI_THRESHOLD_HIGH)).sum()
    fli_high = (df_valid['FLI'] >= FLI_THRESHOLD_HIGH).sum()

    print(f"\n   FLI < 30 (fara steatoza):    {fli_low:5d} ({fli_low/len(df_valid)*100:.1f}%)")
    print(f"   FLI 30-59 (zona incerta):    {fli_mid:5d} ({fli_mid/len(df_valid)*100:.1f}%)")
    print(f"   FLI >= 60 (steatoza):        {fli_high:5d} ({fli_high/len(df_valid)*100:.1f}%)")

    # Exclude uncertain zone — keep only clear cases
    df_clear = df_valid[(df_valid['FLI'] < FLI_THRESHOLD_LOW) |
                        (df_valid['FLI'] >= FLI_THRESHOLD_HIGH)].copy()

    df_clear['Target_Steatoza'] = (df_clear['FLI'] >= FLI_THRESHOLD_HIGH).astype(int)

    print(f"\n   Dupa excluderea zonei incerte:")
    print(f"   Total pacienti: {len(df_clear):,}")
    sanos = (df_clear['Target_Steatoza'] == 0).sum()
    bolnav = (df_clear['Target_Steatoza'] == 1).sum()
    print(f"   0 (Ficat sanatos):      {sanos:5d} ({sanos/len(df_clear)*100:.1f}%)")
    print(f"   1 (Steatoza hepatica):  {bolnav:5d} ({bolnav/len(df_clear)*100:.1f}%)")

    # Cross-tab with diabetes
    if 'Target_Diabet' in df_clear.columns:
        print(f"\n   Corelatie Steatoza x Diabet:")
        cross = pd.crosstab(
            df_clear['Target_Steatoza'].map({0: 'Fara steatoza', 1: 'Steatoza'}),
            df_clear['Target_Diabet'].map({0: 'Sanatos', 1: 'Borderline', 2: 'Diabet'}),
            margins=True
        )
        print(cross.to_string())

    df_clear.to_csv(FISIER_NAFLD, index=False)
    print(f"\n   Salvat: {FISIER_NAFLD}")



def main():
    print("=" * 65)
    print("PIPELINE ML — PREDICTIA STEATOZEI HEPATICE (NAFLD)")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    # Step 0: Create target if needed
    creeaza_target_nafld()

    # Load data
    df, y = incarca_date(FISIER_NAFLD, TARGET_COL, CLASE)

    # Model A: all features (including FLI components)
    rez_A = ruleaza_pipeline(
        'ModelA', TOTI_PREDICTORII, df, y, CLASE, OUTPUT_DIR,
        target_name='Steatoza_Hepatica', cmap='YlOrBr'
    )

    # Model B: without FLI components (prediction from other biomarkers)
    # ALT and AST are kept — they indicate liver damage but are NOT part of FLI
    predictori_B = [p for p in TOTI_PREDICTORII if p not in COLS_FLI]
    rez_B = ruleaza_pipeline(
        'ModelB', predictori_B, df, y, CLASE, OUTPUT_DIR,
        target_name='Steatoza_Hepatica', cmap='YlOrBr'
    )

    afiseaza_tabel_comparativ(rez_A + rez_B, OUTPUT_DIR, 'comparatie_modele_nafld.csv')

    for var in ['ModelA', 'ModelB']:
        rez = [r for r in rez_A + rez_B if r['varianta'] == var]
        best = max(rez, key=lambda x: x['f1_macro'])
        auc = f", AUC={best['auc_roc']:.4f}" if best.get('auc_roc') else ""
        print(f"\nCel mai bun {var}: {best['model']} (F1={best['f1_macro']:.4f}{auc})")

    print(f"\n{'=' * 65}")
    print(f"Pipeline Steatoza Hepatica finalizat! Rezultate in: {OUTPUT_DIR}")
    print(f"{'=' * 65}")


if __name__ == '__main__':
    main()
