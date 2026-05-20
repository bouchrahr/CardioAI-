from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.user import User
from app.models.alert import Alert
from app.core.dependencies import require_doctor

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Retourne les alertes du médecin connecté"""
    alerts = db.query(Alert).filter(
        Alert.doctor_id == current_user.id
    ).order_by(Alert.created_at.desc()).all()

    return [
        {
            "id": alert.id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "message": alert.message,
            "is_read": alert.is_read,
            "created_at": alert.created_at
        }
        for alert in alerts
    ]


@router.get("/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Nombre d'alertes non lues du médecin connecté"""
    count = db.query(Alert).filter(
        Alert.doctor_id == current_user.id,
        Alert.is_read == False
    ).count()
    return {"unread_count": count}


@router.patch("/{alert_id}/read")
def mark_as_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Marque une alerte comme lue"""
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.doctor_id == current_user.id
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")

    alert.is_read = True
    db.commit()
    return {"message": "Alerte marquée comme lue"}


@router.patch("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Marque toutes les alertes du médecin comme lues"""
    db.query(Alert).filter(
        Alert.doctor_id == current_user.id
    ).update({"is_read": True})
    db.commit()
    return {"message": "Toutes les alertes marquées comme lues"}