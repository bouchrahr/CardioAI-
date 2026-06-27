from sqlalchemy.orm import Session
from app.models.log import Log
from typing import Optional


def log_action(
    db: Session,
    action: str,
    user_email: Optional[str] = None,
    user_role: Optional[str] = None,
    details: Optional[str] = None,
):
    """
    Enregistre une action dans la table logs.
    À appeler depuis les routes après une action réussie.
    Ne lève jamais d'exception (le logging ne doit jamais casser la requête principale).
    """
    try:
        log = Log(
            action=action,
            user_email=user_email,
            user_role=user_role,
            details=details,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"[logging_service] Erreur log_action: {e}")
        db.rollback()