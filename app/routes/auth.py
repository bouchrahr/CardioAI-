from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.user import User
from app.models.token_blacklist import TokenBlacklist
from app.schemas.user import LoginRequest, LoginResponse
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_user, oauth2_scheme

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login — retourne un token JWT"""

    # 1. Cherche l'utilisateur par email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    # 2. Vérifie le mot de passe
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    # 3. Vérifie que le compte est actif
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")

    # 4. Crée le token JWT
    token = create_access_token(data={
        "sub": str(user.id),
        "role": user.role,
        "email": user.email
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user": {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name
        }
    }


@router.post("/logout")
def logout(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Logout — révoque le token JWT en le blacklistant"""

    # Ajoute le token à la blacklist
    blacklisted_token = TokenBlacklist(token=token)
    db.add(blacklisted_token)
    db.commit()

    return {"message": f"Au revoir {current_user.first_name} — session terminée"}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Retourne l'utilisateur actuellement connecté"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "is_active": current_user.is_active
    }