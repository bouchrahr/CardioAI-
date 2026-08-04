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

def generate_treatment_simulation_report(medication: dict, eligibility: dict, projection: dict, sources: list, patient_context: dict) -> str:
    """
    Génère un rapport clinique expliquant la simulation médicamenteuse.
    Utilisé par POST /api/cdt/medication/simulate/{twin_id}.
    """
    # Formatage lisible du contexte
    baseline = projection.get("baseline") or {}
    projected = projection.get("projected")
    delta = projection.get("delta")

    projected_str = (
        f"EF projetée : {projected.get('ejection_fraction')}%, "
        f"risque AVC 12m : {projected.get('avc_risk_12m_percent')}%, "
        f"risque composite : {projected.get('composite_risk_level')}, "
        f"horizon : {projected.get('time_horizon_days')} jours"
        if projected else "Aucune projection (traitement non recommandé)."
    )

    reasoning_str = "\n".join(f"- {r}" for r in eligibility.get("reasoning", []))
    warnings_str = "\n".join(f"- {w}" for w in eligibility.get("warnings", [])) or "Aucune"
    sources_str = "\n".join(f"- {s}" for s in sources)

    prompt = f"""
Tu es un cardiologue expert. Rédige un rapport clinique en français expliquant une simulation thérapeutique.

MÉDICAMENT SIMULÉ:
- Nom: {medication['display_name']}
- Classe: {medication['class']}
- Exemples: {medication['examples']}

ÉTAT ACTUEL DU PATIENT:
- Age: {patient_context.get('age')} ans, Sexe: {patient_context.get('gender')}
- Fraction d'éjection (EF): {baseline.get('ejection_fraction')}%
- Risque AVC 12 mois: {baseline.get('avc_risk_12m_percent')}%
- Niveau de risque composite: {baseline.get('composite_risk_level')}

DÉCISION DU SYSTÈME: {eligibility['decision'].upper()}

RAISONNEMENT CLINIQUE (basé sur guidelines ESC 2023):
{reasoning_str}

AVERTISSEMENTS:
{warnings_str}

PROJECTION DES EFFETS:
{projected_str}

SOURCES CITÉES:
{sources_str}

Rédige un rapport avec ces 4 sections courtes:
1. **Justification clinique** : pourquoi ce médicament est (ou n'est pas) indiqué pour ce patient
2. **Bénéfices attendus** : effets projetés en langage clinique
3. **Points de vigilance** : effets secondaires ou surveillance
4. **Conclusion** : recommandation finale claire pour le médecin prescripteur

Sois concis, professionnel, factuel. Cite les sources dans le texte. Maximum 250 mots. Ne recommande pas de posologie précise.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=700,
    )

    return response.choices[0].message.content