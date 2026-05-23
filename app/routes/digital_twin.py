from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database.db import SessionLocal
from app.core.dependencies import require_doctor
from app.models.mri_scan import MRIScan
from app.models.digital_twin import DigitalTwin
from app.models.treatment_simulation import TreatmentSimulation
from app.models.medical_note import MedicalNote
from app.models.patient import Patient
from app.schemas.digital_twin import (
    MRIScanCreate, MRIScanResponse,
    DigitalTwinCreate, DigitalTwinResponse,
    TreatmentSimulationCreate, TreatmentSimulationResponse,
    MedicalNoteCreate, MedicalNoteResponse
)
import os, shutil
from datetime import datetime
from typing import List

router = APIRouter(prefix="/api/cdt", tags=["Digital Twin"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─────────────────────────────────────────
# ENDPOINT 1 — Uploader une IRM
# ─────────────────────────────────────────

@router.post("/upload-mri/{patient_id}", response_model=MRIScanResponse)
def upload_mri(
    patient_id: int,
    file: UploadFile = File(...),
    scan_date: str = None,
    scanner_type: str = None,
    notes: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    # Vérifier que le patient appartient au médecin
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")

    # Vérifier le format du fichier
    allowed = [".dcm", ".nii", ".nii.gz", ".zip"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté. Formats acceptés : {allowed}"
        )

    # Sauvegarder le fichier
    upload_dir = f"uploads/mri/{patient_id}"
    os.makedirs(upload_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = f"{upload_dir}/{timestamp}_{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path) / (1024 * 1024)  # en MB

    # Sauvegarder dans la DB
    mri = MRIScan(
        patient_id=patient_id,
        doctor_id=current_user.id,
        file_path=file_path,
        file_format=ext.replace(".", ""),
        file_size_mb=round(file_size, 2),
        scan_date=datetime.fromisoformat(scan_date) if scan_date else None,
        scanner_type=scanner_type,
        notes=notes,
        status="pending"
    )
    db.add(mri)
    db.commit()
    db.refresh(mri)
    return mri

# ─────────────────────────────────────────
# ENDPOINT 2 — Créer un Digital Twin
# ─────────────────────────────────────────

@router.post("/create/{patient_id}", response_model=DigitalTwinResponse)
def create_digital_twin(
    patient_id: int,
    data: DigitalTwinCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    # Vérifier que le patient appartient au médecin
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")

    # Désactiver l'ancien twin s'il existe
    db.query(DigitalTwin).filter(
        DigitalTwin.patient_id == patient_id,
        DigitalTwin.is_active == True
    ).update({"is_active": False})

    # Créer le nouveau twin
    twin = DigitalTwin(
        patient_id=patient_id,
        doctor_id=current_user.id,
        mri_scan_id=data.mri_scan_id,
        ecg_record_id=data.ecg_record_id,
        status="building",
        is_active=True
    )
    db.add(twin)
    db.commit()
    db.refresh(twin)
    return twin

# ─────────────────────────────────────────
# ENDPOINT 3 — Récupérer le Digital Twin actif
# ─────────────────────────────────────────

@router.get("/{patient_id}/latest", response_model=DigitalTwinResponse)
def get_latest_twin(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    twin = db.query(DigitalTwin).filter(
        DigitalTwin.patient_id == patient_id,
        DigitalTwin.is_active == True
    ).first()
    if not twin:
        raise HTTPException(status_code=404, detail="Aucun Digital Twin trouvé pour ce patient")
    return twin

# ─────────────────────────────────────────
# ENDPOINT 4 — Simuler un traitement
# ─────────────────────────────────────────

@router.post("/simulate/{twin_id}", response_model=TreatmentSimulationResponse)
def simulate_treatment(
    twin_id: int,
    data: TreatmentSimulationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    # Vérifier que le twin existe
    twin = db.query(DigitalTwin).filter(
        DigitalTwin.id == twin_id,
        DigitalTwin.doctor_id == current_user.id
    ).first()
    if not twin:
        raise HTTPException(status_code=404, detail="Digital Twin non trouvé")

    # Créer la simulation (résultats MOCK pour l'instant)
    simulation = TreatmentSimulation(
        digital_twin_id=twin_id,
        doctor_id=current_user.id,
        treatment_type=data.treatment_type,
        treatment_params=data.treatment_params,
        status="completed",
        # Valeurs mock — à remplacer par le vrai modèle LSTM plus tard
        predicted_improvement=72.5,
        avc_risk_reduction=45.0,
        side_effects_risk=12.3,
        llm_simulation_report=f"Simulation du traitement '{data.treatment_type}' : résultats favorables attendus."
    )
    db.add(simulation)
    db.commit()
    db.refresh(simulation)
    return simulation

# ─────────────────────────────────────────
# ENDPOINT 5 — Ajouter une note médicale
# ─────────────────────────────────────────

@router.post("/notes/{patient_id}", response_model=MedicalNoteResponse)
def add_medical_note(
    patient_id: int,
    data: MedicalNoteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")

    note = MedicalNote(
        patient_id=patient_id,
        doctor_id=current_user.id,
        title=data.title,
        content=data.content,
        note_type=data.note_type,
        related_prediction_id=data.related_prediction_id,
        related_simulation_id=data.related_simulation_id
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

# ─────────────────────────────────────────
# ENDPOINT 6 — Récupérer les notes d'un patient
# ─────────────────────────────────────────

@router.get("/notes/{patient_id}", response_model=List[MedicalNoteResponse])
def get_medical_notes(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")

    notes = db.query(MedicalNote).filter(
        MedicalNote.patient_id == patient_id
    ).order_by(MedicalNote.created_at.desc()).all()
    return notes