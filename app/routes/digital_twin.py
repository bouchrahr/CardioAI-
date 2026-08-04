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
from fastapi.responses import FileResponse
from app.services.twin_service import build_twin_state
router = APIRouter(prefix="/api/cdt", tags=["Digital Twin"])
from app.services.medication_service import simulate_medication, list_medications

from app.models.treatment_simulation import TreatmentSimulation

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

   # ─────────────────────────────────────────
# ENDPOINT 7 — Lister tous les MRIScans d'un patient
# ─────────────────────────────────────────

@router.get("/mri/{patient_id}", response_model=List[MRIScanResponse])
def list_patient_mri_scans(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    """
    Retourne la liste de tous les MRIScans d'un patient (ED + ES confondus),
    triés du plus récent au plus ancien.
    """
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")

    scans = db.query(MRIScan).filter(
        MRIScan.patient_id == patient_id
    ).order_by(MRIScan.created_at.desc()).all()
    return scans


# ─────────────────────────────────────────
# ENDPOINT 8 — Télécharger le masque de segmentation d'un MRIScan
# ─────────────────────────────────────────

@router.get("/mri/scan/{scan_id}/segmentation")
def download_segmentation(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    """
    Télécharge le masque de segmentation nnU-Net d'un MRIScan (fichier .nii.gz).
    Le médecin doit être propriétaire du patient associé.
    """
    scan = db.query(MRIScan).filter(MRIScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="MRIScan non trouvé")

    # Vérifier que le scan appartient à un patient du médecin
    patient = db.query(Patient).filter(
        Patient.id == scan.patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=403, detail="Accès refusé à ce scan")

    if not scan.segmentation_path or not os.path.exists(scan.segmentation_path):
        raise HTTPException(
            status_code=404,
            detail="Aucun masque de segmentation disponible pour ce scan"
        )

    filename = f"scan_{scan_id}_{scan.frame_type or 'seg'}_segmentation.nii.gz"
    return FileResponse(
        path=scan.segmentation_path,
        media_type="application/gzip",
        filename=filename,
    )
# ─────────────────────────────────────────
# ENDPOINT 9 — Refresh du Twin State (multi-modal)
# ─────────────────────────────────────────




@router.post("/refresh/{twin_id}")
def refresh_twin_state(
    twin_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    """
    Reconstruit le twin_state en fusionnant :
    - IRM (déjà présent)
    - ECG dominant + confiance sur 24h
    - Alertes récentes
    - CHADS-VASc + facteurs de risque
    - Score composite
    Préserve l'historique (jusqu'à 20 snapshots).
    """
    twin = db.query(DigitalTwin).filter(
        DigitalTwin.id == twin_id,
        DigitalTwin.doctor_id == current_user.id
    ).first()
    if not twin:
        raise HTTPException(status_code=404, detail="Digital Twin non trouvé")

    try:
        state = build_twin_state(twin_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur refresh : {e}")

    return {
        "twin_id": twin_id,
        "refreshed_at": state["timestamp"],
        "composite_risk_level": state["composite_risk_level"],
        "state": state,
    }

   # ─────────────────────────────────────────
# ENDPOINT 10 — Lister les médicaments simulables
# ─────────────────────────────────────────



@router.get("/medication/list")
def get_medications(current_user=Depends(require_doctor)):
    """Liste des médicaments simulables (pour dropdown UI)."""
    return {"medications": list_medications()}


# ─────────────────────────────────────────
# ENDPOINT 11 — Simuler l'impact d'un médicament sur un twin
# ─────────────────────────────────────────

@router.post("/medication/simulate/{twin_id}")
def simulate_medication_on_twin(
    twin_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    """
    Simule l'impact d'un médicament sur le twin actuel et PERSISTE le résultat.
    Vérifie éligibilité (indications + contre-indications ESC 2023),
    projette les effets attendus, cite les sources cliniques,
    génère un rapport LLM, et sauvegarde tout dans TreatmentSimulation.

    Body: {"medication_key": "beta_blocker"}
    """
    twin = db.query(DigitalTwin).filter(
        DigitalTwin.id == twin_id,
        DigitalTwin.doctor_id == current_user.id
    ).first()
    if not twin:
        raise HTTPException(status_code=404, detail="Digital Twin non trouvé")

    medication_key = payload.get("medication_key")
    if not medication_key:
        raise HTTPException(status_code=400, detail="Champ 'medication_key' requis")

    if not twin.twin_state:
        raise HTTPException(
            status_code=400,
            detail="twin_state vide. Lancez d'abord POST /api/cdt/refresh/{twin_id}."
        )

    try:
        result = simulate_medication(medication_key, twin.twin_state)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ─── PERSISTANCE ───
    eligibility = result["eligibility"]
    projection = result["projection"]
    delta = projection.get("delta") or {}

    # Mapping status
    decision = eligibility["decision"]
    if decision == "recommended":
        status_str = "completed"
    elif decision == "not_indicated":
        status_str = "not_indicated"
    else:
        status_str = "contraindicated"

    simulation = TreatmentSimulation(
        digital_twin_id=twin_id,
        doctor_id=current_user.id,
        treatment_type=medication_key,
        treatment_params=result["medication"],
        # Contexte complet stocké dans simulated_ecg_30d (JSONB générique)
        simulated_ecg_30d={
            "eligibility": eligibility,
            "projection": projection,
            "sources": result["sources"],
            "methodology_note": result["methodology_note"],
        },
        predicted_improvement=delta.get("ejection_fraction"),
        avc_risk_reduction=delta.get("avc_risk_reduction_percent"),
        side_effects_risk=None,  # non calculé dans cette version
        llm_simulation_report=result.get("llm_report"),
        status=status_str,
    )
    db.add(simulation)
    db.commit()
    db.refresh(simulation)

    return {
        "twin_id": twin_id,
        "simulation_id": simulation.id,
        "result": result,
    }

# ─────────────────────────────────────────
# ENDPOINT 12 — Historique des simulations médicamenteuses
# ─────────────────────────────────────────

@router.get("/medication/history/{twin_id}")
def get_medication_simulation_history(
    twin_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    """
    Retourne l'historique complet des simulations médicamenteuses pour un twin.
    Triées du plus récent au plus ancien.
    """
    twin = db.query(DigitalTwin).filter(
        DigitalTwin.id == twin_id,
        DigitalTwin.doctor_id == current_user.id
    ).first()
    if not twin:
        raise HTTPException(status_code=404, detail="Digital Twin non trouvé")

    simulations = (
        db.query(TreatmentSimulation)
        .filter(TreatmentSimulation.digital_twin_id == twin_id)
        .order_by(TreatmentSimulation.created_at.desc())
        .all()
    )

    return {
        "twin_id": twin_id,
        "count": len(simulations),
        "simulations": [
            {
                "id": s.id,
                "treatment_type": s.treatment_type,
                "medication": s.treatment_params,
                "status": s.status,
                "predicted_improvement": s.predicted_improvement,
                "avc_risk_reduction": s.avc_risk_reduction,
                "llm_report": s.llm_simulation_report,
                "context": s.simulated_ecg_30d,
                "created_at": s.created_at,
            }
            for s in simulations
        ],
    }


# ─────────────────────────────────────────
# ENDPOINT 13 — Supprimer une simulation
# ─────────────────────────────────────────

@router.delete("/medication/simulation/{simulation_id}")
def delete_medication_simulation(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_doctor)
):
    """Supprime une simulation médicamenteuse."""
    simulation = db.query(TreatmentSimulation).filter(
        TreatmentSimulation.id == simulation_id,
        TreatmentSimulation.doctor_id == current_user.id
    ).first()
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation non trouvée")

    db.delete(simulation)
    db.commit()
    return {"deleted": True, "simulation_id": simulation_id}