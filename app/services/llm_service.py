# Ce fichier appelle Groq LLaMA 3 pour générer le rapport médical

from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_medical_report(ecg_result, risk_data, patient_info):
    """
    Génère un rapport médical professionnel en français
    en utilisant LLaMA 3 via Groq API
    """

    prompt = f"""
Tu es un cardiologue expert. Génère un rapport médical professionnel en français.

DONNÉES PATIENT:
- Age: {patient_info['age']} ans
- Sexe: {patient_info['gender']}
- Diabète: {'Oui' if patient_info['has_diabetes'] else 'Non'}
- Hypertension: {'Oui' if patient_info['has_hypertension'] else 'Non'}
- Maladie vasculaire: {'Oui' if patient_info['has_vascular_disease'] else 'Non'}
- AVC antérieur: {'Oui' if patient_info['previous_stroke'] else 'Non'}

RÉSULTATS ECG:
- Diagnostic: {ecg_result['predicted_class']}
- Confiance: {ecg_result['confidence']:.0%}

SCORE DE RISQUE:
- Score CHADS-VASc: {risk_data['chadsvasc_score']}/9
- Niveau: {risk_data['risk_level']}
- Risque AVC 12 mois: {risk_data['avc_risk_12m']}%

Génère un rapport avec ces 5 sections:
1. Diagnostic principal
2. Analyse du risque
3. Recommandations (ESC 2023)
4. Niveau d'urgence
5. Suivi recommandé

Sois concis et professionnel. Maximum 200 mots.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500
    )

    return response.choices[0].message.content