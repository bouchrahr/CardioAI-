from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.user import User
from app.models.ecg_record import ECGRecord
from app.models.prediction import Prediction
from app.core.dependencies import require_doctor

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("/")
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Retourne l'historique des analyses du médecin connecté"""
    records = db.query(ECGRecord).filter(
        ECGRecord.doctor_id == current_user.id
    ).all()

    result = []
    for record in records:
        prediction = db.query(Prediction).filter(
            Prediction.ecg_record_id == record.id
        ).first()

        result.append({
            "ecg_record_id": record.id,
            "patient_id": record.patient_id,
            "timestamp": record.timestamp,
            "source": record.source,
            "prediction": {
                "predicted_class": prediction.predicted_class,
                "confidence": prediction.confidence,
                "chadsvasc_score": prediction.chadsvasc_score,
                "risk_level": prediction.risk_level,
                "risk_immediate": prediction.risk_immediate,
                "avc_risk_12m": prediction.avc_risk_12m,
            } if prediction else None
        })

    return result


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Statistiques du dashboard pour le médecin connecté"""
    records = db.query(ECGRecord).filter(
        ECGRecord.doctor_id == current_user.id
    ).all()

    record_ids = [r.id for r in records]

    total = db.query(Prediction).filter(
        Prediction.ecg_record_id.in_(record_ids)
    ).count()

    afib = db.query(Prediction).filter(
        Prediction.ecg_record_id.in_(record_ids),
        Prediction.predicted_class == "AFib"
    ).count()

    critical = db.query(Prediction).filter(
        Prediction.ecg_record_id.in_(record_ids),
        Prediction.risk_level == "Critique"
    ).count()

    return {
        "total_analyses": total,
        "afib_count": afib,
        "critical_count": critical,
        "afib_percentage": round((afib / total * 100), 1) if total > 0 else 0
    }