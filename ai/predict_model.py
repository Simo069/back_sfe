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