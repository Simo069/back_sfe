# import pandas as pd
# import os
# import json
# import pickle
# from sklearn.feature_extraction.text import TfidfVectorizer
# from sklearn.ensemble import RandomForestClassifier
# from sklearn.model_selection import train_test_split
# from sklearn.metrics import classification_report, accuracy_score
# from imblearn.over_sampling import RandomOverSampler

# # 1. Charger les données
# json_path = os.path.abspath("../scripts/demandes.json")
# with open(json_path, "r", encoding="utf-8") as f:
#     data = json.load(f)

# df = pd.json_normalize(data)

# # 2. Garder uniquement les colonnes utiles
# cols = ['demandeur', 'firstName', 'lastName', 'detailsUsage', 'commentaireRejet', 'status']
# df = df[cols].copy()

# # 3. Nettoyage + label binaire
# df['status'] = df['status'].str.strip().str.upper()
# df['estRejetee'] = df['status'] == 'REJETEE'
# df['commentaireRejet'] = df['commentaireRejet'].fillna("")

# # 4. Combiner les textes
# df['texte_combine'] = (
#     df['demandeur'].astype(str) + " " +
#     df['firstName'].astype(str) + " " +
#     df['lastName'].astype(str) + " " +
#     df['detailsUsage'].astype(str) + " " +
#     df['commentaireRejet'].astype(str)
# )

# # 5. TF-IDF vectorisation
# vectorizer = TfidfVectorizer(max_features=5000)
# X = vectorizer.fit_transform(df['texte_combine'])
# y = df['estRejetee']

# # 6. Split des données
# X_train, X_test, y_train, y_test = train_test_split(
#     X, y, test_size=0.3, random_state=42, stratify=y
# )

# # 7. Oversampling pour équilibrer les classes
# ros = RandomOverSampler(random_state=42)
# X_resampled, y_resampled = ros.fit_resample(X_train, y_train)

# # 8. Entraîner un RandomForestClassifier sur données équilibrées
# rf_clf = RandomForestClassifier(n_estimators=100, random_state=42)
# rf_clf.fit(X_resampled, y_resampled)

# # 9. Évaluer le modèle sur le test set
# y_pred = rf_clf.predict(X_test)

# print("=== Rapport de classification ===")
# print(classification_report(y_test, y_pred))
# print(f"Précision : {accuracy_score(y_test, y_pred):.2f}")




# # Sauvegarder le modèle entraîné (RandomForestClassifier)
# with open("rf_model.pkl", "wb") as f:
#     pickle.dump(rf_clf, f)

# # Sauvegarder le vectorizer TF-IDF utilisé
# with open("tfidf_vectorizer.pkl", "wb") as f:
#     pickle.dump(vectorizer, f)


import pandas as pd
import os
import json
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from imblearn.over_sampling import RandomOverSampler

#  Charger les données JSON
json_path = os.path.abspath("../scripts/demandes.json")
with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

df = pd.json_normalize(data)

#  Garder les colonnes utiles
cols = [
    'firstName', 'lastName', 'direction', 'directionBu', 'environnement',
    'finaliteAccess', 'detailsUsage', 'dureeAcces', 'demandeur', 'businessOwner',
    'status', 'commentaireRejet'
]

df = df[cols].copy()

#  Prétraitement des colonnes
df.fillna("", inplace=True)
df['status'] = df['status'].str.strip().str.upper()
df['estRejetee'] = df['status'] == 'REJETEE'

# Construction du texte combiné
df['texte_combine'] = (
    df['firstName'] + " " +
    df['lastName'] + " " +
    df['direction'] + " " +
    df['directionBu'] + " " +
    df['environnement'] + " " +
    df['finaliteAccess'] + " " +
    df['detailsUsage'] + " " +
    df['dureeAcces'] + " " +
    df['demandeur'] + " " +
    df['businessOwner'] + " " +
    df['commentaireRejet']
)

# TF-IDF vectorisation
vectorizer = TfidfVectorizer(max_features=5000)
X = vectorizer.fit_transform(df['texte_combine'])
y = df['estRejetee']

#  Split des données
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42, stratify=y
)

# Oversampling
ros = RandomOverSampler(random_state=42)
X_resampled, y_resampled = ros.fit_resample(X_train, y_train)

#  Entraînement modèle Random Forest
rf_clf = RandomForestClassifier(n_estimators=100, random_state=42)
rf_clf.fit(X_resampled, y_resampled)

#  Évaluation
y_pred = rf_clf.predict(X_test)
print("=== Rapport de classification ===")
print(classification_report(y_test, y_pred))
print(f"Précision : {accuracy_score(y_test, y_pred):.2f}")



# Sauvegarder le modèle entraîné (RandomForestClassifier)
with open("rf_model.pkl", "wb") as f:
    pickle.dump(rf_clf, f)

# Sauvegarder le vectorizer TF-IDF utilisé
with open("tfidf_vectorizer.pkl", "wb") as f:
    pickle.dump(vectorizer, f)