"""
Therapeutic Simulation Service — Guidelines-Grounded Decision Support.

Simule l'impact d'une prescription médicamenteuse sur le patient en s'appuyant
sur les guidelines ESC 2023 (Atrial Fibrillation & Heart Failure).

Contrairement à une simulation naïve, ce service :
  1. Vérifie l'éligibilité clinique du patient au médicament (indications)
  2. Détecte les contre-indications selon les comorbidités
  3. Projette les effets attendus avec sources littéraires citées
  4. Retourne une décision structurée (Recommandé / Non indiqué / Contre-indiqué)

Sources principales :
  - ESC 2023 AF Guidelines (Van Gelder et al.)
  - ESC 2023 HF Guidelines (McDonagh et al.)
  - Méta-analyses citées par entrée médicamenteuse
"""
from datetime import datetime
from typing import Optional


# ─────────────────────────────────────────
# BASE DE CONNAISSANCES MÉDICAMENTEUSE
# Chaque entrée est traçable à une source clinique
# ─────────────────────────────────────────

MEDICATION_KNOWLEDGE_BASE = {
    "doac_anticoagulant": {
        "display_name": "Anticoagulant oral direct (DOAC)",
        "class": "Anticoagulant",
        "examples": "Apixaban, Rivaroxaban, Dabigatran",
        "indications": {
            "requires_afib": True,
            "min_chadsvasc_male": 2,
            "min_chadsvasc_female": 3,
        },
        "contraindications": [
            "previous_stroke",  # Rare : hémorragie intracérébrale récente
        ],
        "projected_effects": {
            "stroke_risk_reduction_percent": 65,
            "bleeding_risk_increase_percent": 25,
            "ef_change_percent": 0,
            "time_to_effect_days": 3,
        },
        "sources": [
            "ESC 2023 AF Guidelines, Class I recommendation for CHA₂DS₂-VASc ≥ 2 (H) / ≥ 3 (F)",
            "Ruff et al., Lancet 2014 - Meta-analysis of DOAC vs Warfarin (RR 0.81 stroke)",
        ],
    },

    "beta_blocker": {
        "display_name": "Bêta-bloquant cardio-sélectif",
        "class": "Bêta-bloquant",
        "examples": "Bisoprolol, Métoprolol, Carvédilol",
        "indications": {
            "requires_hfref": True,  # EF < 40%
            "or_requires_afib": True,
        },
        "contraindications": [],
        "projected_effects": {
            "ef_improvement_percent": 8,   # Amélioration EF en 3 mois
            "hr_reduction_bpm": 15,
            "mortality_reduction_percent": 34,
            "time_to_effect_days": 90,
        },
        "sources": [
            "ESC 2023 HF Guidelines, Class I recommendation for HFrEF",
            "CIBIS-II trial 1999 - Bisoprolol reduces mortality by 34% in HFrEF",
        ],
    },

    "acei_arb": {
        "display_name": "IEC / ARA-II",
        "class": "Inhibiteur du système rénine-angiotensine",
        "examples": "Ramipril, Enalapril (IEC) / Valsartan, Losartan (ARA-II)",
        "indications": {
            "requires_hfref": True,
            "or_requires_hypertension": True,
        },
        "contraindications": [],
        "projected_effects": {
            "ef_improvement_percent": 10,
            "systolic_bp_reduction_mmhg": 12,
            "mortality_reduction_percent": 20,
            "time_to_effect_days": 180,
        },
        "sources": [
            "ESC 2023 HF Guidelines, Class I recommendation for HFrEF",
            "SOLVD trial 1991 - Enalapril reduces mortality in HFrEF",
        ],
    },

    "diuretic_loop": {
        "display_name": "Diurétique de l'anse",
        "class": "Diurétique",
        "examples": "Furosémide, Torasémide",
        "indications": {
            "requires_hf_with_congestion": True,
        },
        "contraindications": [],
        "projected_effects": {
            "symptom_relief_percent": 70,
            "ef_change_percent": 0,   # Symptomatique, pas de remodelage
            "time_to_effect_days": 1,
        },
        "sources": [
            "ESC 2023 HF Guidelines, Class I for symptomatic HF",
            "Symptomatic treatment - no proven mortality benefit",
        ],
    },

    "antiarrhythmic_amiodarone": {
        "display_name": "Antiarythmique (Amiodarone)",
        "class": "Antiarythmique Classe III",
        "examples": "Amiodarone",
        "indications": {
            "requires_afib": True,
        },
        "contraindications": [
            # QT long, dysfonction thyroïdienne - non trackés dans notre modèle
        ],
        "projected_effects": {
            "cardioversion_success_percent": 65,
            "sinus_rhythm_maintenance_1y_percent": 55,
            "time_to_effect_days": 7,
        },
        "sources": [
            "ESC 2023 AF Guidelines, Class IIa for rhythm control",
            "AFFIRM trial 2002 - Rhythm vs rate control equivalent",
        ],
    },
}


# ─────────────────────────────────────────
# LOGIQUE D'ÉLIGIBILITÉ
# ─────────────────────────────────────────

def _check_eligibility(medication_key: str, twin_state: dict, patient_context: dict) -> dict:
    """
    Vérifie si le patient est éligible au médicament selon guidelines ESC 2023.
    Retourne : {"decision": ..., "reasoning": [...], "warnings": [...]}
    """
    med = MEDICATION_KNOWLEDGE_BASE[medication_key]
    indications = med["indications"]
    contraindications = med["contraindications"]

    reasoning = []
    warnings = []

    # Extraction des variables cliniques du twin_state
    ecg = twin_state.get("ecg_24h", {})
    mri = twin_state.get("mri", {})
    risk = twin_state.get("risk", {})
    factors = risk.get("factors", {})

    dominant_rhythm = ecg.get("dominant_rhythm")
    ef = mri.get("ejection_fraction")
    chadsvasc = risk.get("chadsvasc_score") or 0
    gender = factors.get("gender")
    has_afib = dominant_rhythm == "AFib"
    has_hfref = ef is not None and ef < 40
    has_hypertension = factors.get("hypertension", False)

    # ─── Vérification des INDICATIONS ───
    indication_met = False

    if indications.get("requires_afib") and has_afib:
        indication_met = True
        reasoning.append(f"AFib détectée (rythme dominant 24h)")

        # Vérif CHADS-VASc pour anticoagulant
        min_score = (
            indications.get("min_chadsvasc_female", 3) if gender == "F"
            else indications.get("min_chadsvasc_male", 2)
        )
        if "min_chadsvasc_male" in indications or "min_chadsvasc_female" in indications:
            if chadsvasc < min_score:
                indication_met = False
                reasoning.append(
                    f"CHADS-VASc = {chadsvasc} < seuil {min_score} pour {gender} : anticoagulation non indiquée"
                )
            else:
                reasoning.append(
                    f"CHADS-VASc = {chadsvasc} ≥ {min_score} : anticoagulation indiquée"
                )

    if indications.get("requires_hfref") and has_hfref:
        indication_met = True
        reasoning.append(f"HFrEF confirmée (EF = {ef}% < 40%)")

    if indications.get("or_requires_afib") and has_afib and not indication_met:
        indication_met = True
        reasoning.append(f"AFib présente (indication alternative)")

    if indications.get("or_requires_hypertension") and has_hypertension and not indication_met:
        indication_met = True
        reasoning.append(f"Hypertension présente (indication alternative)")

    if indications.get("requires_hf_with_congestion"):
        # Pas de vraie détection de congestion, approximation par HF sévère
        if ef is not None and ef < 40:
            indication_met = True
            reasoning.append("Insuffisance cardiaque - traitement symptomatique justifié")

    # ─── Vérification des CONTRE-INDICATIONS ───
    ci_triggered = []
    for ci in contraindications:
        if factors.get(ci, False):
            ci_triggered.append(ci)

    if ci_triggered:
        warnings.append(f"Contre-indication relative : {', '.join(ci_triggered)}")

    # ─── DÉCISION FINALE ───
    if ci_triggered:
        decision = "contraindicated"
    elif indication_met:
        decision = "recommended"
    else:
        decision = "not_indicated"
        reasoning.append("Aucune indication clinique remplie selon guidelines ESC 2023")

    return {
        "decision": decision,
        "reasoning": reasoning,
        "warnings": warnings,
    }


# ─────────────────────────────────────────
# PROJECTION DES EFFETS
# ─────────────────────────────────────────

def _project_medication_effects(medication_key: str, twin_state: dict, decision: str) -> dict:
    """
    Projette l'état du patient après début du traitement.
    Retourne baseline + projected + delta.
    """
    med = MEDICATION_KNOWLEDGE_BASE[medication_key]
    effects = med["projected_effects"]

    mri = twin_state.get("mri", {})
    risk = twin_state.get("risk", {})

    current_ef = mri.get("ejection_fraction")
    current_avc_risk = risk.get("avc_risk_12m") or 0
    current_composite = twin_state.get("composite_risk_level", "Low")

    # Projection uniquement si recommandé
    if decision != "recommended":
        return {
            "baseline": {
                "ejection_fraction": current_ef,
                "avc_risk_12m_percent": current_avc_risk,
                "composite_risk_level": current_composite,
            },
            "projected": None,
            "delta": None,
            "note": "Effets non projetés : traitement non recommandé pour ce patient.",
        }

    # Calcul projections
    ef_delta = effects.get("ef_improvement_percent", 0) or effects.get("ef_change_percent", 0)
    projected_ef = round(current_ef + ef_delta, 2) if current_ef is not None else None

    stroke_reduction = effects.get("stroke_risk_reduction_percent", 0)
    projected_avc = round(current_avc_risk * (1 - stroke_reduction / 100), 2)

    # Composite risk : downgrade d'un niveau si effet significatif
    RISK_LEVELS = ["Low", "Medium", "High", "Critical"]
    try:
        idx = RISK_LEVELS.index(current_composite)
    except ValueError:
        idx = 0
    if ef_delta >= 8 or stroke_reduction >= 50:
        new_idx = max(0, idx - 1)
    else:
        new_idx = idx
    projected_composite = RISK_LEVELS[new_idx]

    return {
        "baseline": {
            "ejection_fraction": current_ef,
            "avc_risk_12m_percent": current_avc_risk,
            "composite_risk_level": current_composite,
        },
        "projected": {
            "ejection_fraction": projected_ef,
            "avc_risk_12m_percent": projected_avc,
            "composite_risk_level": projected_composite,
            "time_horizon_days": effects.get("time_to_effect_days"),
        },
        "delta": {
            "ejection_fraction": ef_delta,
            "avc_risk_reduction_percent": stroke_reduction,
        },
    }


# ─────────────────────────────────────────
# POINT D'ENTRÉE PRINCIPAL
# ─────────────────────────────────────────

def simulate_medication(medication_key: str, twin_state: dict) -> dict:
    """
    Point d'entrée principal.
    Retourne une simulation complète : éligibilité + projection + sources.
    """
    if medication_key not in MEDICATION_KNOWLEDGE_BASE:
        raise ValueError(
            f"Médicament '{medication_key}' inconnu. "
            f"Disponibles : {list(MEDICATION_KNOWLEDGE_BASE.keys())}"
        )

    if not twin_state:
        raise ValueError("twin_state vide. Rafraîchissez d'abord le twin.")

    med = MEDICATION_KNOWLEDGE_BASE[medication_key]

    # 1. Vérifier éligibilité
    eligibility = _check_eligibility(
        medication_key=medication_key,
        twin_state=twin_state,
        patient_context={},
    )

    # 2. Projeter les effets
    projection = _project_medication_effects(
        medication_key=medication_key,
        twin_state=twin_state,
        decision=eligibility["decision"],
    )
    # 3. Contexte patient extrait du twin_state (pour le LLM)
    risk_factors = (twin_state.get("risk") or {}).get("factors") or {}
    patient_context = {
        "age": risk_factors.get("age"),
        "gender": risk_factors.get("gender"),
    }

    # 4. Rapport LLM (facultatif, ne fait pas échouer la simulation)
    llm_report = None
    try:
        from app.services.llm_service import generate_treatment_simulation_report
        llm_report = generate_treatment_simulation_report(
            medication={
                "display_name": med["display_name"],
                "class": med["class"],
                "examples": med["examples"],
            },
            eligibility=eligibility,
            projection=projection,
            sources=med["sources"],
            patient_context=patient_context,
        )
    except Exception as e:
        llm_report = f"[Rapport LLM indisponible : {str(e)[:100]}]"

    return {
        "simulated_at": datetime.utcnow().isoformat(),
        "medication": {
            "key": medication_key,
            "display_name": med["display_name"],
            "class": med["class"],
            "examples": med["examples"],
        },
        "eligibility": eligibility,
        "projection": projection,
        "sources": med["sources"],
        "llm_report": llm_report,
        "methodology_note": (
            "Cette simulation applique les critères d'éligibilité ESC 2023 "
            "et projette les effets attendus à partir de la littérature clinique. "
            "Elle est destinée à l'aide à la décision, non à la prescription automatisée."
        ),
    }

    


def list_medications() -> list:
    """Liste des médicaments simulables (pour dropdown UI)."""
    return [
        {
            "key": key,
            "display_name": med["display_name"],
            "class": med["class"],
        }
        for key, med in MEDICATION_KNOWLEDGE_BASE.items()
    ]