from pydantic import BaseModel
from typing import Optional

class CreatePatientRequest(BaseModel):
    """Ce que le médecin envoie pour créer un patient"""
    first_name: str
    last_name: str
    age: int
    gender: str          # 'M' ou 'F'
    height: Optional[float] = None
    weight: Optional[float] = None
    medical_history: Optional[str] = None
    has_diabetes: bool = False
    has_hypertension: bool = False
    has_vascular_disease: bool = False
    previous_stroke: bool = False
    email: str           # email de login du patient
    password: str        # mot de passe du patient

class PatientResponse(BaseModel):
    """Ce que le backend renvoie"""
    id: int
    age: int
    gender: str
    has_diabetes: bool
    has_hypertension: bool
    has_vascular_disease: bool
    previous_stroke: bool

    class Config:
        from_attributes = True