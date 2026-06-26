from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.user import User
from app.models.patient import Patient
from app.schemas.user import CreateUserRequest, UserResponse
from app.core.security import hash_password
from app.core.dependencies import require_admin, get_current_user
from app.services.logging_service import log_action
from app.schemas.user import UpdateUserRequest  # à ajouter en haut si pas déjà là (ATTENTION: voir schéma plus bas)

from app.schemas.user import CreateUserRequest, UserResponse, UpdateUserRequest 
router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("/doctor", response_model=UserResponse)
def create_doctor(
    request: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
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

    log_action(
        db=db,
        action="USER_CREATED",
        user_email=current_user.email,
        user_role=current_user.role,
        details=f"Médecin #{new_user.id} créé ({new_user.first_name} {new_user.last_name})",
    )

    return new_user


@router.get("/", response_model=list[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """L'admin voit tous les utilisateurs"""
    return db.query(User).all()


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retourne l'utilisateur actuellement connecté"""
    return current_user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    L'admin supprime un utilisateur — point d'entrée UNIQUE depuis le frontend.
    Comportement selon le rôle :
      - admin   → 403 (interdit)
      - patient → 409 si ECG associés, sinon cascade alerts/patient/user
      - doctor  → 409 si patients associés, sinon supprime user
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # --- Cas 1 : admin ---
    if user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Impossible de supprimer un administrateur"
        )

    # --- Cas 2 : doctor ---
    if user.role == "doctor":
        patient_count = db.query(Patient).filter(
            Patient.doctor_id == user.id
        ).count()
        if patient_count > 0:
            raise HTTPException(
                status_code=409,
                detail=f"Impossible : ce médecin a {patient_count} patient(s). Veuillez d'abord les réassigner ou les supprimer."
            )

        # Capture identité avant suppression
        full_name = f"{user.first_name} {user.last_name}"
        email = user.email

        db.delete(user)
        db.commit()

        log_action(
            db=db,
            action="USER_DELETED",
            user_email=current_user.email,
            user_role=current_user.role,
            details=f"Médecin {full_name} ({email})",
        )
        return {"message": "Médecin supprimé"}

    # --- Cas 3 : patient ---
    if user.role == "patient":
        from app.models.ecg_record import ECGRecord
        from app.models.prediction import Prediction
        from app.models.alert import Alert

        # Trouve le profil patient via user_id
        patient = db.query(Patient).filter(Patient.user_id == user.id).first()

        if patient:
            # Refuse si ECG associés (politique 409 — force à réfléchir)
            ecg_count = db.query(ECGRecord).filter(
                ECGRecord.patient_id == patient.id
            ).count()
            if ecg_count > 0:
                raise HTTPException(
                    status_code=409,
                    detail=f"Impossible : ce patient a {ecg_count} analyse(s) ECG. Veuillez d'abord les supprimer."
                )

            # Pas d'ECG → on peut supprimer en cascade les alertes + patient + user
            db.query(Alert).filter(Alert.patient_id == patient.id).delete()
            db.delete(patient)

        # Capture identité avant suppression du user
        full_name = f"{user.first_name} {user.last_name}"
        email = user.email

        db.delete(user)
        db.commit()

        log_action(
            db=db,
            action="USER_DELETED",
            user_email=current_user.email,
            user_role=current_user.role,
            details=f"Patient {full_name} ({email})",
        )
        return {"message": "Patient supprimé"}

    # Cas non prévu (rôle inconnu)
    raise HTTPException(status_code=400, detail=f"Rôle inconnu : {user.role}")


   
@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    request: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    L'admin modifie un utilisateur. Tous les champs sont optionnels :
    envoie uniquement ce que tu veux changer.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    changes = []

    if request.email is not None and request.email != user.email:
        existing = db.query(User).filter(User.email == request.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
        user.email = request.email
        changes.append("email")

    if request.first_name is not None:
        user.first_name = request.first_name
        changes.append("prénom")

    if request.last_name is not None:
        user.last_name = request.last_name
        changes.append("nom")

    if request.password is not None and request.password.strip():
        user.password_hash = hash_password(request.password)
        changes.append("mot de passe")

    if not changes:
        raise HTTPException(status_code=400, detail="Aucune modification fournie")

    db.commit()
    db.refresh(user)

    log_action(
        db=db,
        action="USER_UPDATED",
        user_email=current_user.email,
        user_role=current_user.role,
        details=f"Utilisateur #{user.id} ({user.email}) — champs modifiés : {', '.join(changes)}",
    )

    return user


@router.patch("/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Bascule le statut actif/désactivé d'un utilisateur.
    Refuse de désactiver un administrateur (sécurité).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Impossible de désactiver un compte administrateur"
        )

    user.is_active = not user.is_active
    new_status = user.is_active
    db.commit()

    action = "USER_REACTIVATED" if new_status else "USER_DEACTIVATED"
    log_action(
        db=db,
        action=action,
        user_email=current_user.email,
        user_role=current_user.role,
        details=f"Utilisateur #{user.id} ({user.email}) — statut : {'actif' if new_status else 'désactivé'}",
    )

    return {
        "id": user.id,
        "is_active": user.is_active,
        "message": f"Utilisateur {'réactivé' if new_status else 'désactivé'}"
    }


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    KPIs globaux du système — vue admin.
    """
    from app.models.ecg_record import ECGRecord
    from app.models.alert import Alert
    from datetime import datetime, timedelta

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    total_users = db.query(User).count()
    total_doctors = db.query(User).filter(User.role == "doctor").count()
    total_patients_users = db.query(User).filter(User.role == "patient").count()
    total_patients = db.query(Patient).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    inactive_users = db.query(User).filter(User.is_active == False).count()

    total_ecg = db.query(ECGRecord).count()
    ecg_this_week = db.query(ECGRecord).filter(
        ECGRecord.created_at >= week_ago
    ).count() if hasattr(ECGRecord, 'created_at') else None

    total_alerts = db.query(Alert).count()
    critical_alerts = db.query(Alert).filter(
        Alert.severity.in_(["critical", "high", "Critique", "Eleve"])
    ).count() if hasattr(Alert, 'severity') else None

    return {
        "users": {
            "total": total_users,
            "doctors": total_doctors,
            "patients": total_patients_users,
            "active": active_users,
            "inactive": inactive_users,
        },
        "patients_records": total_patients,
        "ecg": {
            "total": total_ecg,
            "last_7_days": ecg_this_week,
        },
        "alerts": {
            "total": total_alerts,
            "critical": critical_alerts,
        },
    }