"""
Service Digital Twin — fusion multi-modale de l'état patient.

Construit un snapshot horodaté combinant :
  - IRM (déjà calculée dans le DigitalTwin)
  - ECG (rythme dominant, confiance, tendance sur 24h)
  - Facteurs de risque (CHADS-VASc via CardioRisk Engine)
  - Alertes récentes
  - Synthèse composite

Le résultat est stocké dans DigitalTwin.twin_state (JSONB).
Chaque refresh préserve l'ancien état dans history[].
"""
from datetime import datetime, timedelta
from collections import Counter
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.digital_twin import DigitalTwin
from app.models.patient import Patient
from app.models.ecg_record import ECGRecord
from app.models.prediction import Prediction
from app.models.alert import Alert
from app.services.risk_engine import calculate_chadsvasc


def _compute_ecg_summary(patient_id: int, db: Session, hours: int = 24) -> dict:
    """
    Agrège les prédictions ECG des dernières `hours` heures pour un patient.
    Retourne rythme dominant, confiance moyenne, distribution des classes.
    """
    since = datetime.utcnow() - timedelta(hours=hours)

    predictions = (
        db.query(Prediction)
        .join(ECGRecord, Prediction.ecg_record_id == ECGRecord.id)
        .filter(ECGRecord.patient_id == patient_id)
        .filter(Prediction.created_at >= since)
        .order_by(desc(Prediction.created_at))
        .all()
    )

    if not predictions:
        return {
            "available": False,
            "dominant_rhythm": None,
            "confidence_avg": None,
            "n_windows": 0,
            "distribution": {},
            "window_hours": hours,
        }

    classes = [p.predicted_class for p in predictions if p.predicted_class]
    counter = Counter(classes)
    dominant = counter.most_common(1)[0][0] if classes else None
    total = len(classes)
    distribution = {cls: round(cnt / total, 3) for cls, cnt in counter.items()}

    confidences = [p.confidence for p in predictions if p.confidence is not None]
    conf_avg = round(sum(confidences) / len(confidences), 3) if confidences else None

    return {
        "available": True,
        "dominant_rhythm": dominant,
        "confidence_avg": conf_avg,
        "n_windows": total,
        "distribution": distribution,
        "window_hours": hours,
        "latest_prediction_at": predictions[0].created_at.isoformat(),
    }


def _compute_alerts_summary(patient_id: int, db: Session, hours: int = 24) -> dict:
    """Compte les alertes ECG par sévérité sur la fenêtre glissante."""
    since = datetime.utcnow() - timedelta(hours=hours)
    alerts = (
        db.query(Alert)
        .filter(Alert.patient_id == patient_id)
        .filter(Alert.created_at >= since)
        .all()
    )
    by_severity = Counter(a.severity for a in alerts if a.severity)
    return {
        "total_24h": len(alerts),
        "by_severity": dict(by_severity),
    }


def _compute_mri_summary(twin: DigitalTwin) -> dict:
    """Extrait le résumé IRM depuis le twin lui-même."""
    if twin.ejection_fraction is None:
        return {"available": False}
    return {
        "available": True,
        "ejection_fraction": twin.ejection_fraction,
        "edv_ml": twin.edv_ml,
        "esv_ml": twin.esv_ml,
        "stroke_volume_ml": twin.stroke_volume_ml,
        "myocardium_mass_g": twin.myocardium_mass_g,
        "rv_edv_ml": twin.rv_edv_ml,
        "clinical_status": twin.clinical_status,
    }


def _compute_risk_summary(patient: Patient, twin: DigitalTwin, ecg_summary: dict) -> dict:
    """
    Calcule CHADS-VASc + niveau de risque via CardioRisk Engine.
    L'insuffisance cardiaque (composante 'C') est DÉDUITE de l'EF (HFrEF = EF < 40%).
    """
    dominant_rhythm = ecg_summary.get("dominant_rhythm") or "Normal"
    conf_avg = ecg_summary.get("confidence_avg") or 0.9

    class_map = {"Normal": 0, "AFib": 1, "PVC": 2, "Other": 3}
    idx = class_map.get(dominant_rhythm, 0)
    probs = [0.05, 0.05, 0.05, 0.05]
    probs[idx] = conf_avg
    total = sum(probs)
    probs = [p / total for p in probs]

    # Déduction de l'insuffisance cardiaque depuis l'EF (HFrEF = EF < 40%)
    ef = twin.ejection_fraction
    has_heart_failure = ef is not None and ef < 40

    result = calculate_chadsvasc(
        age=patient.age,
        gender=patient.gender,
        has_diabetes=patient.has_diabetes,
        has_hypertension=patient.has_hypertension,
        has_vascular_disease=patient.has_vascular_disease,
        previous_stroke=patient.previous_stroke,
        ecg_class=dominant_rhythm,
        ecg_probs=probs,
        ef_percent=ef,
        has_heart_failure=has_heart_failure,
    )

    return {
        "chadsvasc_score": result.get("chadsvasc_score"),
        "risk_level": result.get("risk_level"),
        "risk_immediate": result.get("risk_immediate"),
        "avc_risk_12m": result.get("avc_risk_12m"),
        "heart_failure_deduced": has_heart_failure,
        "factors": {
            "age": patient.age,
            "gender": patient.gender,
            "hypertension": patient.has_hypertension,
            "diabetes": patient.has_diabetes,
            "vascular_disease": patient.has_vascular_disease,
            "previous_stroke": patient.previous_stroke,
            "heart_failure": has_heart_failure,
            "dominant_rhythm_used": dominant_rhythm,
            "ef_used": ef,
        },
    }

def _compute_composite_risk(ecg_summary: dict, risk_summary: dict, alerts_summary: dict, mri_summary: dict) -> str:
    """Score composite basé sur règles cliniques ESC 2023."""
    # Priorité 1 : arythmie critique récente
    if alerts_summary["by_severity"].get("Critical", 0) > 0:
        return "Critical"

    # Priorité 2 : EF sévèrement réduite (ESC 2023 : EF < 40%)
    ef = mri_summary.get("ejection_fraction")
    if ef is not None and ef < 30:
        return "Critical"
    if ef is not None and ef < 40:
        return "High"

    dominant = ecg_summary.get("dominant_rhythm")
    chadsvasc = risk_summary.get("chadsvasc_score") or 0

    if dominant == "AFib" and chadsvasc >= 2:
        return "High"
    if dominant == "AFib" or chadsvasc >= 3:
        return "High"
    if alerts_summary["by_severity"].get("High", 0) > 0:
        return "High"
    if dominant in ("PVC", "Other") or chadsvasc >= 1:
        return "Medium"

    return "Low"

def build_twin_state(twin_id: int, db: Session) -> dict:
    """
    Point d'entrée principal : construit et sauvegarde le twin_state.
    Retourne le state complet.
    """
    twin = db.query(DigitalTwin).filter(DigitalTwin.id == twin_id).first()
    if not twin:
        raise ValueError(f"DigitalTwin {twin_id} non trouvé")

    patient = db.query(Patient).filter(Patient.id == twin.patient_id).first()
    if not patient:
        raise ValueError(f"Patient {twin.patient_id} non trouvé")

    mri = _compute_mri_summary(twin)
    ecg = _compute_ecg_summary(twin.patient_id, db)
    alerts = _compute_alerts_summary(twin.patient_id, db)
    risk = _compute_risk_summary(patient, twin, ecg)
    composite = _compute_composite_risk(ecg, risk, alerts, mri)

    snapshot = {
        "timestamp": datetime.utcnow().isoformat(),
        "mri": mri,
        "ecg_24h": ecg,
        "alerts_24h": alerts,
        "risk": risk,
        "composite_risk_level": composite,
    }

    # Historique : préserve les anciens snapshots (max 20)
    previous_state = twin.twin_state or {}
    history = previous_state.get("history", [])
    if "timestamp" in previous_state and previous_state.get("timestamp"):
        old_snapshot = {k: v for k, v in previous_state.items() if k != "history"}
        history.append(old_snapshot)
        history = history[-20:]

    new_state = {
        **snapshot,
        "history": history,
    }

    twin.twin_state = new_state
    twin.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(twin)

    return new_state