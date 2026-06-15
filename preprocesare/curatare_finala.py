"""Curatare finala: produce Dataset_Diabet_Clean.csv din quasi-completul de 11k.

Elimina coloanele non-predictor (ID, Ciclu, Diagnostic_*, Nr_Lipsuri), pastreaza
cei 26 de predictori + 3 target-uri, si converteste Status_Fumator si Sex la int.
"""

import pandas as pd

FISIER_INTRARE = 'Dataset_NHANES_Quasi_Complet_11k.csv'
FISIER_IESIRE = 'Dataset_Diabet_Clean.csv'

COLOANE_DE_ELIMINAT = [
    'ID_Pacient',                  # Identificator unic, nu e feature
    'Ciclu',                       # Ar introduce bias temporal
    'Diagnostic_Diabet',           # Redundant cu Target_Diabet
    'Diagnostic_Hipertensiune',    # Redundant cu Target_Hipertensiune
    'Diagnostic_Colesterol_Mare',  # Redundant cu Target_Colesterol
    'Nr_Lipsuri',                  # Metadata de calitate, nu feature
]

PREDICTORI = [
    'Sex', 'Varsta', 'BMI', 'Circumferinta_Abdominala',
    'Tensiune_Sistolica', 'Tensiune_Diastolica',
    'Colesterol_Total', 'Colesterol_HDL', 'Colesterol_LDL', 'Trigliceride',
    'HbA1c_Glicata', 'Glicemie_Fasting', 'Acid_Uric',
    'Ficat_ALT', 'Ficat_AST', 'Ficat_GGT',
    'Creatinina_Sange', 'Uree_Sange', 'Albumina_Urina_Ratio',
    'Hemoglobina', 'MCV_Volum_Eritrocitar', 'Feritina_Fier',
    'Vitamina_D', 'Folat_Acid_Folic',
    'Inflamatie_CRP',
    'Status_Fumator',
]

TARGET_COLS = ['Target_Diabet', 'Target_Hipertensiune', 'Target_Colesterol']

df = pd.read_csv(FISIER_INTRARE)
df_clean = df.drop(columns=[c for c in COLOANE_DE_ELIMINAT if c in df.columns])

# Status_Fumator NHANES 1.0=Da, 2.0=Nu -> 0=Nu, 1=Da, 2=Necunoscut (pentru NaN)
df_clean['Status_Fumator'] = df_clean['Status_Fumator'].map({1.0: 1, 2.0: 0})
df_clean['Status_Fumator'] = df_clean['Status_Fumator'].fillna(2).astype(int)

# Sex NHANES 1=Masculin, 2=Feminin
df_clean['Sex'] = df_clean['Sex'].astype(int)

df_clean.to_csv(FISIER_IESIRE, index=False)

print(f"Salvat {FISIER_IESIRE}: {df_clean.shape[0]} randuri x {df_clean.shape[1]} coloane")
print(df_clean['Target_Diabet'].value_counts().sort_index())
