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
    """Ce qu'on renvoie au frontend"""
    id: int
    patient_id: int
    doctor_id: int
    file_path: str
    file_format: str
    file_size_mb: Optional[float]
    scan_date: Optional[datetime]
    scanner_type: Optional[str]
    status: str
    lv_volume_ml: Optional[float]
    rv_volume_ml: Optional[float]
    myocardium_mass_g: Optional[float]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# ─────────────────────────────────────────
# DIGITAL TWIN
# ─────────────────────────────────────────

class DigitalTwinCreate(BaseModel):
    """Ce qu'on reçoit pour créer un jumeau numérique"""
    mri_scan_id: Optional[int] = None
    ecg_record_id: Optional[int] = None

class DigitalTwinResponse(BaseModel):
    """Ce qu'on renvoie au frontend"""
    id: int
    patient_id: int
    doctor_id: int
    mri_scan_id: Optional[int]
    ecg_record_id: Optional[int]
    status: str
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
# TREATMENT SIMULATION
# ─────────────────────────────────────────

class TreatmentSimulationCreate(BaseModel):
    """Ce qu'on reçoit pour lancer une simulation"""
    treatment_type: str
    # Valeurs possibles :
    # "anticoagulant", "beta_blocker", "ablation", "cardioversion", "pacemaker"
    treatment_params: Optional[Any] = None

class TreatmentSimulationResponse(BaseModel):
    """Ce qu'on renvoie au frontend"""
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
    """Ce qu'on reçoit quand le médecin écrit une note"""
    title: Optional[str] = None
    content: str
    note_type: str = "general"
    related_prediction_id: Optional[int] = None
    related_simulation_id: Optional[int] = None

class MedicalNoteResponse(BaseModel):
    """Ce qu'on renvoie au frontend"""
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