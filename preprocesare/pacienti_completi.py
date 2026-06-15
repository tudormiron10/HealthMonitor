import pandas as pd

nume_fisier = 'Dataset_NHANES_Multiclasa_Final.csv'
df = pd.read_csv(nume_fisier)

coloane_interes = [
    'Sex', 'Varsta', 'BMI', 'Circumferinta_Abdominala',
    'Tensiune_Sistolica', 'Tensiune_Diastolica', 'HbA1c_Glicata', 'Glicemie_Fasting',
    'Colesterol_Total', 'Colesterol_HDL', 'Trigliceride', 'Colesterol_LDL',
    'Inflamatie_CRP', 'Ficat_ALT', 'Ficat_AST', 'Ficat_GGT', 'Creatinina_Sange',
    'Uree_Sange', 'Albumina_Urina_Ratio', 'Acid_Uric', 'Hemoglobina',
    'MCV_Volum_Eritrocitar', 'Feritina_Fier', 'Vitamina_D', 'Folat_Acid_Folic',
    'Target_Diabet', 'Target_Hipertensiune', 'Target_Colesterol', 'Status_Fumator'
]

print(f"Analiza integritate date: {len(df)} pacienti")

# Completitudine per ciclu
for c in df['Ciclu'].unique():
    df_c = df[df['Ciclu'] == c]
    complete_c = df_c[coloane_interes].dropna().shape[0]
    print(f"Ciclul {c}: {complete_c}/{len(df_c)} completi ({round(complete_c/len(df_c)*100, 2)}%)")

# Top coloane cu cele mai multe valori lipsa
raport_lipsa = df[coloane_interes].isnull().mean() * 100
print("Top 10 coloane cu valori lipsa:")
print(raport_lipsa.sort_values(ascending=False).head(10))

cazuri_perfecte_total = df[coloane_interes].dropna().shape[0]
print(f"Pacienti perfecti (toate ciclurile): {cazuri_perfecte_total} ({round(cazuri_perfecte_total/len(df)*100, 2)}%)")
