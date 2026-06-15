import pandas as pd

nume_intrare = 'Dataset_NHANES_Multiclasa_Final.csv'
nume_iesire = 'Dataset_NHANES_Quasi_Complet_11k.csv'

df = pd.read_csv(nume_intrare)

# Cele 26 de coloane medicale verificate pentru completitudine
cols_analize = [
    'Sex', 'Varsta', 'BMI', 'Circumferinta_Abdominala', 'Tensiune_Sistolica',
    'Tensiune_Diastolica', 'HbA1c_Glicata', 'Glicemie_Fasting', 'Colesterol_Total',
    'Colesterol_HDL', 'Trigliceride', 'Colesterol_LDL', 'Inflamatie_CRP',
    'Ficat_ALT', 'Ficat_AST', 'Ficat_GGT', 'Creatinina_Sange', 'Uree_Sange',
    'Albumina_Urina_Ratio', 'Acid_Uric', 'Hemoglobina', 'MCV_Volum_Eritrocitar',
    'Feritina_Fier', 'Vitamina_D', 'Folat_Acid_Folic', 'Status_Fumator'
]

df['Nr_Lipsuri'] = df[cols_analize].isnull().sum(axis=1)

# Pastram pacientii cu maxim 2 coloane lipsa
df_quasi = df[df['Nr_Lipsuri'] <= 2].copy()
df_quasi.to_csv(nume_iesire, index=False)

print(f"Salvat {nume_iesire}: {len(df_quasi)}/{len(df)} pacienti ({round(len(df_quasi)/len(df)*100, 2)}%)")
print(df_quasi['Target_Diabet'].value_counts().sort_index())
