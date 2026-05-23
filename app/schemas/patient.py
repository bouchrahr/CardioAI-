from pydantic import BaseModel
from typing import Optional

class CreatePatientRequest(BaseModel):
    first_name: str
    last_name: str
    age: int
    gender: str
    height: Optional[float] = None
    weight: Optional[float] = None
    medical_history: Optional[str] = None
    has_diabetes: bool = False
    has_hypertension: bool = False
    has_vascular_disease: bool = False
    previous_stroke: bool = False
    email: str
    password: str

class PatientResponse(BaseModel):
    id: int
    age: int
    gender: str
    has_diabetes: bool
    has_hypertension: bool
    has_vascular_disease: bool
    previous_stroke: bool
    # Infos du compte user
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True