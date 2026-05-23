from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.user import User
from app.models.patient import Patient
from app.schemas.patient import CreatePatientRequest, PatientResponse
from app.core.security import hash_password
from app.core.dependencies import require_doctor, get_current_user

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.post("/", response_model=PatientResponse)
def create_patient(
    request: CreatePatientRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)  # ← seulement médecin
):
    """Le médecin crée un patient — assigné automatiquement à lui"""

    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    # Crée le compte login du patient
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        role="patient",
        first_name=request.first_name,
        last_name=request.last_name,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Crée le profil médical — doctor_id vient du token JWT !
    patient = Patient(
        user_id=user.id,
        doctor_id=current_user.id,  # ← plus de hardcode !
        age=request.age,
        gender=request.gender,
        height=request.height,
        weight=request.weight,
        medical_history=request.medical_history,
        has_diabetes=request.has_diabetes,
        has_hypertension=request.has_hypertension,
        has_vascular_disease=request.has_vascular_disease,
        previous_stroke=request.previous_stroke
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/", response_model=list[PatientResponse])
def get_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Le médecin voit SEULEMENT ses propres patients"""
    patients = db.query(Patient).filter(
        Patient.doctor_id == current_user.id
    ).all()

    result = []
    for patient in patients:
        # Récupère le compte user du patient
        user = db.query(User).filter(User.id == patient.user_id).first()
        patient_data = {
            "id": patient.id,
            "age": patient.age,
            "gender": patient.gender,
            "has_diabetes": patient.has_diabetes,
            "has_hypertension": patient.has_hypertension,
            "has_vascular_disease": patient.has_vascular_disease,
            "previous_stroke": patient.previous_stroke,
            "first_name": user.first_name if user else None,
            "last_name": user.last_name if user else None,
            "email": user.email if user else None,
        }
        result.append(patient_data)

    return result


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Détails d'un patient — vérifie qu'il appartient au médecin connecté"""
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")

    return patient

@router.put("/{patient_id}")
def update_patient(
    patient_id: int,
    request: CreatePatientRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Le médecin modifie un patient"""

    # Vérifie que le patient appartient à ce médecin
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")

    # Met à jour les informations
    patient.age = request.age
    patient.gender = request.gender
    patient.height = request.height
    patient.weight = request.weight
    patient.medical_history = request.medical_history
    patient.has_diabetes = request.has_diabetes
    patient.has_hypertension = request.has_hypertension
    patient.has_vascular_disease = request.has_vascular_disease
    patient.previous_stroke = request.previous_stroke

    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    """Le médecin supprime un patient et toutes ses données"""
    from app.models.ecg_record import ECGRecord
    from app.models.prediction import Prediction
    from app.models.alert import Alert

    # Vérifie que le patient appartient à ce médecin
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")

    # 1. Supprime les alertes du patient
    db.query(Alert).filter(Alert.patient_id == patient_id).delete()

    # 2. Supprime les prédictions liées aux ECG du patient
    ecg_records = db.query(ECGRecord).filter(
        ECGRecord.patient_id == patient_id
    ).all()
    for ecg in ecg_records:
        db.query(Prediction).filter(
            Prediction.ecg_record_id == ecg.id
        ).delete()

    # 3. Supprime les ECG records
    db.query(ECGRecord).filter(
        ECGRecord.patient_id == patient_id
    ).delete()

    # 4. Supprime le patient
    db.delete(patient)
    db.commit()

    # 5. Supprime aussi le compte login du patient
    user = db.query(User).filter(User.id == patient.user_id).first()
    if user:
        db.delete(user)
        db.commit()

    return {"message": "Patient et toutes ses données supprimés avec succès"}
    
    return {"message": "Patient et toutes ses données supprimés avec succès"}