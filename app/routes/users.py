from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.user import User
from app.schemas.user import CreateUserRequest, UserResponse
from app.core.security import hash_password
from app.core.dependencies import require_admin, get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("/doctor", response_model=UserResponse)
def create_doctor(
    request: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← seulement admin
):
    """L'admin crée un compte médecin"""
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    new_user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        role="doctor",
        first_name=request.first_name,
        last_name=request.last_name,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/", response_model=list[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ← seulement admin
):
    """L'admin voit tous les utilisateurs"""
    return db.query(User).all()


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retourne l'utilisateur actuellement connecté"""
    return current_user