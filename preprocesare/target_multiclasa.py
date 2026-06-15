import pandas as pd

nume_intrare = 'Dataset_NHANES_Master_2013_2020.csv'
nume_iesire = 'Dataset_NHANES_Multiclasa_Final.csv'

df = pd.read_csv(nume_intrare)

# Diabet (DIQ010): 2 -> 0 Sanatos, 3 -> 1 Borderline, 1 -> 2 Diabet
mapping_diabet = {2.0: 0, 3.0: 1, 1.0: 2}
df['Target_Diabet'] = df['Diagnostic_Diabet'].map(mapping_diabet)

# Hipertensiune / Colesterol: binar 1 -> 1 (Da), 2 -> 0 (Nu)
mapping_binar = {1.0: 1, 2.0: 0}
df['Target_Hipertensiune'] = df['Diagnostic_Hipertensiune'].map(mapping_binar)
df['Target_Colesterol'] = df['Diagnostic_Colesterol_Mare'].map(mapping_binar)

# Eliminam pacientii fara eticheta de diabet valida (raspunsuri 7/9/NaN)
linii_inainte = len(df)
df_curat = df.dropna(subset=['Target_Diabet'])

df_curat.to_csv(nume_iesire, index=False)

print(f"Salvat {nume_iesire}: {len(df_curat)} pacienti ({linii_inainte - len(df_curat)} eliminati)")
print(df_curat['Target_Diabet'].value_counts().sort_index())
