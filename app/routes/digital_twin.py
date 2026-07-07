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
    DigitalTwinCreate, DigitalTwinResponse,
    MRIScanResponse, MRIAnalysisResponse,
    TreatmentSimulationCreate, TreatmentSimulationResponse,
    MedicalNoteCreate, MedicalNoteResponse
)
from app.services.mri_service import mri_service, analyze_mri_pair
import os
import shutil
from datetime import datetime
from typing import List

router = APIRouter(prefix="/api/cdt", tags=["Digital Twin"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _validate_nii(file: UploadFile):
    """Vérifie qu'un fichier est bien un NIfTI .nii ou .nii.gz."""
    name = (file.filename or "").lower()
    if not (name.endswith(".nii") or name.endswith(".nii.gz")):
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté pour '{file.filename}'. Attendu : .nii ou .nii.gz"
        )


def _save_upload(file: UploadFile, dest_path: str) -> float:
    """Sauvegarde un UploadFile sur disque, retourne la taille en MB."""
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return round(os.path.getsize(dest_path) / (1024 * 1024), 2)


# ─────────────────────────────────────────
# ENDPOINT 1 — Uploader une IRM (ED + ES) et générer le Digital Twin
# ─────────────────────────────────────────

@router.post("/upload-mri/{patient_id}", response_model=MRIAnalysisResponse)
def upload_mri_and_analyze(
    patient_id: int,
    ed_file: UploadFile = File(..., description="Frame End-Diastole (.nii.gz)"),
    es_file: UploadFile = File(..., description="Frame End-Systole (.nii.gz)"),
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    """
    Uploade une paire IRM (ED + ES), lance la segmentation nnU-Net sur chaque
    frame, calcule les volumes cardiaques et l'Ejection Fraction, puis crée
    un DigitalTwin complet.

    ATTENTION : sur CPU, l'inférence des 2 frames prend ~20-60 secondes.
    La requête est synchrone (pas de file d'attente dans cette version).
    """
    # 1. Vérifier que le patient appartient au médecin
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")

    # 2. Vérifier la disponibilité du modèle
    if not mri_service.is_available:
        raise HTTPException(
            status_code=503,
            detail="Le modèle de segmentation IRM n'est pas disponible sur le serveur."
        )

    # 3. Valider les formats
    _validate_nii(ed_file)
    _validate_nii(es_file)

    # 4. Sauvegarder les fichiers d'origine
    upload_dir = f"uploads/mri/{patient_id}"
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    ed_path = f"{upload_dir}/{ts}_ED.nii.gz"
    es_path = f"{upload_dir}/{ts}_ES.nii.gz"
    ed_size = _save_upload(ed_file, ed_path)
    es_size = _save_upload(es_file, es_path)

    # Chemins de sortie pour les masques prédits
    ed_seg_path = f"{upload_dir}/{ts}_ED_seg.nii.gz"
    es_seg_path = f"{upload_dir}/{ts}_ES_seg.nii.gz"

    # 5. Lancer l'analyse nnU-Net (ED + ES)
    try:
        result = analyze_mri_pair(
            ed_path=ed_path,
            es_path=es_path,
            ed_seg_out=ed_seg_path,
            es_seg_out=es_seg_path,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'analyse IRM : {e}")

    ed_data = result["ed"]
    es_data = result["es"]
    clinical = result["clinical"]

    # 6. Créer les 2 MRIScans (ED et ES)
    mri_ed = MRIScan(
        patient_id=patient_id,
        doctor_id=current_user.id,
        file_path=ed_path,
        file_format="nii.gz",
        file_size_mb=ed_size,
        frame_type="ED",
        status="completed",
        segmentation_path=ed_data["seg_path"],
        lv_volume_ml=ed_data["lv_volume_ml"],
        rv_volume_ml=ed_data["rv_volume_ml"],
        myocardium_mass_g=ed_data["myocardium_mass_g"],
        voxel_spacing=ed_data["spacing"],
    )
    mri_es = MRIScan(
        patient_id=patient_id,
        doctor_id=current_user.id,
        file_path=es_path,
        file_format="nii.gz",
        file_size_mb=es_size,
        frame_type="ES",
        status="completed",
        segmentation_path=es_data["seg_path"],
        lv_volume_ml=es_data["lv_volume_ml"],
        rv_volume_ml=es_data["rv_volume_ml"],
        myocardium_mass_g=es_data["myocardium_mass_g"],
        voxel_spacing=es_data["spacing"],
    )
    db.add(mri_ed)
    db.add(mri_es)
    db.commit()
    db.refresh(mri_ed)
    db.refresh(mri_es)

    # 7. Désactiver l'ancien twin actif du patient
    db.query(DigitalTwin).filter(
        DigitalTwin.patient_id == patient_id,
        DigitalTwin.is_active == True
    ).update({"is_active": False})

    # 8. Créer le DigitalTwin
    twin = DigitalTwin(
        patient_id=patient_id,
        doctor_id=current_user.id,
        mri_scan_ed_id=mri_ed.id,
        mri_scan_es_id=mri_es.id,
        status="ready",
        edv_ml=clinical["edv_ml"],
        esv_ml=clinical["esv_ml"],
        stroke_volume_ml=clinical["stroke_volume_ml"],
        ejection_fraction=clinical["ejection_fraction"],
        myocardium_mass_g=clinical["myocardium_mass_g"],
        rv_edv_ml=clinical["rv_edv_ml"],
        clinical_status=clinical["clinical_status"],
        segmentation_meta={
            "ed_slices": ed_data["n_slices"],
            "es_slices": es_data["n_slices"],
            "ed_spacing": ed_data["spacing"],
            "es_spacing": es_data["spacing"],
        },
        is_active=True,
    )
    db.add(twin)
    db.commit()
    db.refresh(twin)

    return MRIAnalysisResponse(
        digital_twin=twin,
        mri_scan_ed=mri_ed,
        mri_scan_es=mri_es,
        message=(
            f"Analyse terminée. EF = {clinical['ejection_fraction']}% "
            f"({clinical['clinical_status']})."
        ),
    )


# ─────────────────────────────────────────
# ENDPOINT 2 — Créer un Digital Twin manuellement (à partir de scans existants)
# ─────────────────────────────────────────

@router.post("/create/{patient_id}", response_model=DigitalTwinResponse)
def create_digital_twin(
    patient_id: int,
    data: DigitalTwinCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")

    db.query(DigitalTwin).filter(
        DigitalTwin.patient_id == patient_id,
        DigitalTwin.is_active == True
    ).update({"is_active": False})

    twin = DigitalTwin(
        patient_id=patient_id,
        doctor_id=current_user.id,
        mri_scan_ed_id=data.mri_scan_ed_id,
        mri_scan_es_id=data.mri_scan_es_id,
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
# ENDPOINT 4 — Simuler un traitement (MOCK, inchangé)
# ─────────────────────────────────────────

@router.post("/simulate/{twin_id}", response_model=TreatmentSimulationResponse)
def simulate_treatment(
    twin_id: int,
    data: TreatmentSimulationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    twin = db.query(DigitalTwin).filter(
        DigitalTwin.id == twin_id,
        DigitalTwin.doctor_id == current_user.id
    ).first()
    if not twin:
        raise HTTPException(status_code=404, detail="Digital Twin non trouvé")

    simulation = TreatmentSimulation(
        digital_twin_id=twin_id,
        doctor_id=current_user.id,
        treatment_type=data.treatment_type,
        treatment_params=data.treatment_params,
        status="completed",
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