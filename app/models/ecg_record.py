# Table "ecg_records" — enregistrements ECG uploadés ou reçus via MySignals

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database.db import Base

class ECGRecord(Base):
    __tablename__ = "ecg_records"

    id         = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    doctor_id  = Column(Integer, ForeignKey("users.id"))
    timestamp  = Column(DateTime, server_default=func.now())
    file_path  = Column(String)    # chemin du fichier ECG sauvegardé
    duration   = Column(Float)     # durée en secondes
    source     = Column(String)    # 'upload' ou 'mysignals'