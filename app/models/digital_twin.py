from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.db import Base

class DigitalTwin(Base):
    __tablename__ = "digital_twins"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Sources de données fusionnées
    mri_scan_id = Column(Integer, ForeignKey("mri_scans.id"), nullable=True)
    ecg_record_id = Column(Integer, ForeignKey("ecg_records.id"), nullable=True)

    # Statut
    status = Column(String, default="pending")
    # pending → building → ready → outdated

    # Embedding de fusion (Cross-Attention ECG+IRM)
    cdt_embedding = Column(JSONB, nullable=True)     # vecteur 512D

    # Simulation électrophysiologique (Neural Eikonal)
    activation_map = Column(JSONB, nullable=True)    # carte d'activation électrique
    conduction_velocity = Column(Float, nullable=True)  # m/s

    # Prédictions LSTM (évolution temporelle)
    prediction_7d = Column(JSONB, nullable=True)     # ECG prédit J+7
    prediction_30d = Column(JSONB, nullable=True)    # ECG prédit J+30
    prediction_90d = Column(JSONB, nullable=True)    # ECG prédit J+90
    confidence_intervals = Column(JSONB, nullable=True)

    # Risque évolutif
    progression_risk = Column(String, nullable=True)  # "stable", "aggravation", "amélioration"
    progression_score = Column(Float, nullable=True)  # 0.0 → 1.0

    is_active = Column(Boolean, default=True)        # le twin le plus récent du patient
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    patient = relationship("Patient", back_populates="digital_twins")
    mri_scan = relationship("MRIScan", back_populates="digital_twins")
    simulations = relationship("TreatmentSimulation", back_populates="digital_twin")