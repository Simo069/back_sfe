# import pickle

# # Charger modèle et vectorizer
# with open("rf_model.pkl", "rb") as f:
#     model = pickle.load(f)

# with open("tfidf_vectorizer.pkl", "rb") as f:
#     vectorizer = pickle.load(f)

# def predire_risque_rejet(donnees_dict):
#     texte_combine = " ".join(str(donnees_dict.get(col, "")) for col in ["demandeur", "firstName", "lastName", "detailsUsage", "commentaireRejet"])
#     X_vect = vectorizer.transform([texte_combine])
#     prediction = model.predict(X_vect)[0]
#     proba = model.predict_proba(X_vect)[0][1]  # probabilité d'être rejeté
#     return prediction, proba

# # Exemple de test
# exemple_demande = {
#     "demandeur": "dupont",
#     "firstName": "jean",
#     "lastName": "paul",
#     "detailsUsage": "Demande d'accès temporaire au service comptabilité",
#     "commentaireRejet": ""
# }

# pred, prob = predire_risque_rejet(exemple_demande)
# print(f"Prédiction rejetée ? {pred}")
# print(f"Probabilité rejet : {prob:.2f}")










# import sys
# import json
# import joblib

# def main():
#     try:
#         # Charger modèle et vectorizer
#         model = joblib.load('ai/rf_model.pkl')
#         vectorizer = joblib.load('ai/tfidf_vectorizer.pkl')

#         # Lecture JSON d'entrée
#         if len(sys.argv) < 2:
#             raise ValueError("Aucun argument JSON reçu")
#         input_json = sys.argv[1]
#         demande_data = json.loads(input_json)

#         # Construction du texte combiné
#         texte_combine = " ".join([
#             str(demande_data.get('firstName', '')),
#             str(demande_data.get('lastName', '')),
#             str(demande_data.get('direction', '')),
#             str(demande_data.get('directeurBU', '')),
#             str(demande_data.get('environnement', '')),
#             str(demande_data.get('finaliteAcces', '')),
#             str(demande_data.get('detailsUsage', '')),
#             str(demande_data.get('dureeAcces', '')),
#             str(demande_data.get('demandeur', '')),
#             str(demande_data.get('businessOwner', '')),
#             str(demande_data.get('commentaireRejet', ''))
#         ])

#         # TF-IDF + prédiction
#         X_input = vectorizer.transform([texte_combine])
#         pred = model.predict(X_input)[0]
#         proba = model.predict_proba(X_input)[0][1]

#         # Résultat JSON
#         result = {
#             'estRejetee': bool(pred),
#             'probabiliteRejet': round(float(proba), 4)
#         }

#         print(json.dumps(result))

#     except Exception as e:
#         print(json.dumps({"error": str(e)}))

# if __name__ == "__main__":
#     main()




import sys
import json
import joblib

def main():
    try:
        # Charger le modèle et le vectorizer
        model = joblib.load('ai/rf_model.pkl')
        vectorizer = joblib.load('ai/tfidf_vectorizer.pkl')

        # Vérifier les arguments
        if len(sys.argv) < 2:
            raise ValueError("Aucun argument JSON reçu")
        
        # Charger les données JSON
        input_json = sys.argv[1]
        demande_data = json.loads(input_json)

        # Extraire et combiner les champs textuels
        champs = [
            'firstName', 'lastName', 'direction', 'directeurBU', 'environnement',
            'finaliteAcces', 'detailsUsage', 'dureeAcces',
            'demandeur', 'businessOwner', 'commentaireRejet'
        ]

        texte_combine = " ".join([
            str(demande_data.get(champ, "")) for champ in champs
        ])

        # Vectorisation
        X_input = vectorizer.transform([texte_combine])

        # Prédiction
        pred = model.predict(X_input)[0]
        proba = model.predict_proba(X_input)[0][1]  # proba que la demande soit rejetée

        # Résultat
        result = {
            'estRejetee': bool(pred),
            'probabiliteRejet': round(float(proba), 4)
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()