from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.db import SessionLocal
from app.models.log import Log
from app.core.dependencies import require_admin

router = APIRouter(prefix="/api/logs", tags=["Logs"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def get_logs(
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """
    Liste les derniers logs (admin uniquement).
    Réponse formatée pour matcher le composant Logs.jsx du frontend.
    """
    logs = db.query(Log).order_by(desc(Log.created_at)).limit(limit).all()

    # Mapping vers le format attendu par le frontend
    return [
        {
            "id": log.id,
            "action": log.action,
            "user": log.user_email,
            "role": log.user_role,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]