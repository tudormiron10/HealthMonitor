import pandas as pd
import os

# Caile catre fisierele curate, per ciclu NHANES
calea_13_14 = os.path.join('13-14', 'Dataset_Curat_2013_2014.csv')
calea_15_16 = os.path.join('15-16', 'Dataset_Curat_2015_2016.csv')
calea_17_18 = os.path.join('17-18', 'Dataset_Curat_2017_2018.csv')
calea_19_20 = os.path.join('19-20', 'Dataset_Curat_2019_2020.csv')

fisiere = [calea_13_14, calea_15_16, calea_17_18, calea_19_20]
existente = [f for f in fisiere if os.path.exists(f)]

if len(existente) < 4:
    print(f"Atentie: gasite doar {len(existente)} din 4 fisiere.")
    for f in fisiere:
        if not os.path.exists(f):
            print(f"Lipseste: {f}")
else:
    dataframes = [pd.read_csv(f) for f in existente]
    df_master = pd.concat(dataframes, ignore_index=True)

    nume_iesire = 'Dataset_NHANES_Master_2013_2020.csv'
    df_master.to_csv(nume_iesire, index=False)

    print(f"Salvat {nume_iesire}: {df_master.shape[0]} randuri x {df_master.shape[1]} coloane")
    print(df_master['Ciclu'].value_counts())
