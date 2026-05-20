# Ce fichier gère le login
# URL : POST /api/auth/login

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, LoginResponse
from app.core.security import verify_password, create_access_token

# APIRouter = un groupe d'endpoints
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    
    # 1. Cherche l'utilisateur par email dans la base
    user = db.query(User).filter(User.email == request.email).first()
    
    # 2. Si pas trouvé → erreur
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # 3. Vérifie le mot de passe
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # 4. Crée le token JWT
    token = create_access_token(data={
        "sub": str(user.id),
        "role": user.role,
        "email": user.email
    })
    
    # 5. Retourne le token + infos utilisateur
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