# Table "patients" — informations médicales du patient

from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database.db import Base

class Patient(Base):
    __tablename__ = "patients"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"))  # compte login du patient
    doctor_id        = Column(Integer, ForeignKey("users.id"))  # médecin responsable
    age              = Column(Integer)
    gender           = Column(String(1))   # 'M' ou 'F'
    height           = Column(Float)
    weight           = Column(Float)
    medical_history  = Column(Text)
    has_diabetes     = Column(Boolean, default=False)
    has_hypertension = Column(Boolean, default=False)
    has_vascular_disease = Column(Boolean, default=False)
    previous_stroke  = Column(Boolean, default=False)
    created_at       = Column(DateTime, server_default=func.now())