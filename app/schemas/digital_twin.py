from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

# ─────────────────────────────────────────
# MRI SCAN
# ─────────────────────────────────────────

class MRIScanCreate(BaseModel):
    """Ce qu'on reçoit quand le médecin uploade une IRM"""
    scan_date: Optional[datetime] = None
    scanner_type: Optional[str] = None
    notes: Optional[str] = None


class MRIScanResponse(BaseModel):
    """Ce qu'on renvoie au frontend pour une frame IRM"""
    id: int
    patient_id: int
    doctor_id: int
    file_path: str
    file_format: str
    file_size_mb: Optional[float]
    frame_type: Optional[str]           # "ED" ou "ES"
    scan_date: Optional[datetime]
    scanner_type: Optional[str]
    status: str
    segmentation_path: Optional[str]
    lv_volume_ml: Optional[float]
    rv_volume_ml: Optional[float]
    myocardium_mass_g: Optional[float]
    voxel_spacing: Optional[Any]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# DIGITAL TWIN
# ─────────────────────────────────────────

class DigitalTwinCreate(BaseModel):
    """Ce qu'on reçoit pour créer un jumeau numérique manuellement"""
    mri_scan_ed_id: Optional[int] = None
    mri_scan_es_id: Optional[int] = None
    ecg_record_id: Optional[int] = None


class DigitalTwinResponse(BaseModel):
    """Ce qu'on renvoie au frontend"""
    id: int
    patient_id: int
    doctor_id: int
    mri_scan_ed_id: Optional[int]
    mri_scan_es_id: Optional[int]
    ecg_record_id: Optional[int]
    status: str

    # Résultats cliniques nnU-Net
    edv_ml: Optional[float]
    esv_ml: Optional[float]
    stroke_volume_ml: Optional[float]
    ejection_fraction: Optional[float]
    myocardium_mass_g: Optional[float]
    rv_edv_ml: Optional[float]
    clinical_status: Optional[str]
    segmentation_meta: Optional[Any]

    # Champs avancés (non implémentés, toujours null)
    activation_map: Optional[Any]
    conduction_velocity: Optional[float]
    prediction_7d: Optional[Any]
    prediction_30d: Optional[Any]
    prediction_90d: Optional[Any]
    confidence_intervals: Optional[Any]
    progression_risk: Optional[str]
    progression_score: Optional[float]

    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# RÉPONSE COMBINÉE UPLOAD IRM (ED + ES + Twin)
# ─────────────────────────────────────────

class MRIAnalysisResponse(BaseModel):
    """
    Réponse complète de POST /api/cdt/upload-mri/{patient_id}
    Contient les deux MRIScans + le DigitalTwin résultant.
    """
    digital_twin: DigitalTwinResponse
    mri_scan_ed: MRIScanResponse
    mri_scan_es: MRIScanResponse
    message: str


# ─────────────────────────────────────────
# TREATMENT SIMULATION
# ─────────────────────────────────────────

class TreatmentSimulationCreate(BaseModel):
    treatment_type: str
    treatment_params: Optional[Any] = None


class TreatmentSimulationResponse(BaseModel):
    id: int
    digital_twin_id: int
    doctor_id: int
    treatment_type: str
    treatment_params: Optional[Any]
    simulated_ecg_7d: Optional[Any]
    simulated_ecg_30d: Optional[Any]
    simulated_ecg_90d: Optional[Any]
    predicted_improvement: Optional[float]
    avc_risk_reduction: Optional[float]
    side_effects_risk: Optional[float]
    llm_simulation_report: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# MEDICAL NOTE
# ─────────────────────────────────────────

class MedicalNoteCreate(BaseModel):
    title: Optional[str] = None
    content: str
    note_type: str = "general"
    related_prediction_id: Optional[int] = None
    related_simulation_id: Optional[int] = None


class MedicalNoteResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    title: Optional[str]
    content: str
    note_type: str
    related_prediction_id: Optional[int]
    related_simulation_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True