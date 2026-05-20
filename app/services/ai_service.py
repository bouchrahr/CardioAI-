# Ce fichier contient la logique IA
# Pour l'instant on utilise des réponses MOCK (fausses)
# Plus tard on remplacera par le vrai modèle InceptionTime

import numpy as np
import random

def predict_ecg(ecg_data):
    """
    Analyse le signal ECG et retourne une prédiction.
    MOCK pour l'instant — sera remplacé par InceptionTime
    """
    classes = ['Normal', 'AFib', 'Other']
    predicted = random.choice(classes)
    confidence = random.uniform(0.75, 0.99)

    return {
        "predicted_class": predicted,
        "confidence": round(confidence, 3),
        "probabilities": {
            "Normal": round(random.uniform(0.01, 0.2), 3),
            "AFib": round(confidence if predicted == 'AFib' else random.uniform(0.01, 0.1), 3),
            "Other": round(random.uniform(0.01, 0.1), 3)
        },
        "attention_map": [round(random.uniform(0, 1), 3) for _ in range(100)]
    }


def calculate_chadsvasc(age, gender, has_diabetes, has_hypertension,
                         has_vascular_disease, previous_stroke, ecg_class):
    """
    Calcule le score CHADS-VASc réel basé sur les guidelines ESC 2023
    """
    score = 0

    if has_hypertension:     score += 1
    if age >= 75:            score += 2
    elif age >= 65:          score += 1
    if has_diabetes:         score += 1
    if previous_stroke:      score += 2
    if has_vascular_disease: score += 1
    if gender == 'F':        score += 1

    # Niveau de risque
    if score == 0:   risk_level = 'Faible'
    elif score == 1: risk_level = 'Modéré'
    elif score == 2: risk_level = 'Élevé'
    else:            risk_level = 'Critique'

    # Risque immédiat basé sur l'ECG
    if ecg_class == 'AFib' and score >= 2:
        risk_immediate = 'Critique'
    elif ecg_class == 'AFib':
        risk_immediate = 'Urgent'
    elif ecg_class == 'Other':
        risk_immediate = 'Attention'
    else:
        risk_immediate = 'Stable'

    # Risque AVC à 12 mois (ESC 2023)
    risk_table = {
        0: 0.0, 1: 1.3, 2: 2.2, 3: 3.2,
        4: 4.0, 5: 6.7, 6: 9.8, 7: 9.6,
        8: 6.7, 9: 15.2
    }
    avc_risk = risk_table.get(min(score, 9), 15.2)

    return {
        "chadsvasc_score": score,
        "risk_level": risk_level,
        "risk_immediate": risk_immediate,
        "avc_risk_12m": avc_risk
    }