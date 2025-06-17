import pandas as pd
import os
import json


json_path = os.path.abspath("../scripts/demandes.json")


with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Charger dans un DataFrame
df = pd.json_normalize(data)

print("✅ Aperçu des données :")
print(df.head())
print("\n📌 Colonnes disponibles :")
print(list(df.columns))
print("\n🧾 Informations générales :")
print(df.info())

# Colonnes qu’on garde
colonnes_utiles = [
    'demandeur', 'firstName', 'lastName',
    'detailsUsage', 'dureeAcces', 'businessOwner',
    'dateDebut', 'dateFin', 'direction', 'directionBu',
    'environnement', 'extraction', 'finaliteAccess',
    'interneExterne', 'schema', 'status', 'commentaireRejet'
]

# Nettoyage
df_clean = df[colonnes_utiles].copy()

# Corriger les éventuelles erreurs de format dans 'status'
df_clean['status'] = df_clean['status'].str.strip().str.upper()

# Ajouter la colonne cible
df_clean['estRejetee'] = df_clean['status'] == 'REJETEE'

# Afficher un aperçu
print("\n✅ Données nettoyées :")
print(df_clean.head())

print("\n📊 Répartition des classes (acceptées vs rejetées) :")
print(df_clean['estRejetee'].value_counts())