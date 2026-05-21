from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.user import User
from app.models.token_blacklist import TokenBlacklist
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Vérifie le token, vérifie la blacklist, retourne l'utilisateur"""

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Vérifie si le token est blacklisté
    blacklisted = db.query(TokenBlacklist).filter(
        TokenBlacklist.token == token
    ).first()
    if blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expirée — veuillez vous reconnecter",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Décode le token
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    # 3. Récupère l'utilisateur
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Autorise seulement les admins"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs"
        )
    return current_user


def require_doctor(current_user: User = Depends(get_current_user)) -> User:
    """Autorise seulement les médecins"""
    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux médecins"
        )
    return current_user


def require_patient(current_user: User = Depends(get_current_user)) -> User:
    """Autorise seulement les patients"""
    if current_user.role not in ["patient", "doctor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé"
        )
    return current_user