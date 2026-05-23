from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.db import Base

class TreatmentSimulation(Base):
    __tablename__ = "treatment_simulations"

    id = Column(Integer, primary_key=True, index=True)
    digital_twin_id = Column(Integer, ForeignKey("digital_twins.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Traitement simulé
    treatment_type = Column(String, nullable=False)
    # "anticoagulant", "beta_blocker", "ablation", "cardioversion", "pacemaker"

    treatment_params = Column(JSONB, nullable=True)
    # ex: {"drug": "warfarin", "dose_mg": 5, "frequency": "daily"}

    # Résultats de simulation
    simulated_ecg_7d = Column(JSONB, nullable=True)
    simulated_ecg_30d = Column(JSONB, nullable=True)
    simulated_ecg_90d = Column(JSONB, nullable=True)

    # Métriques d'efficacité prédite
    predicted_improvement = Column(Float, nullable=True)   # % amélioration
    avc_risk_reduction = Column(Float, nullable=True)      # % réduction risque AVC
    side_effects_risk = Column(Float, nullable=True)       # % risque effets secondaires

    # Rapport LLM sur la simulation
    llm_simulation_report = Column(Text, nullable=True)

    status = Column(String, default="pending")  # pending → running → completed → failed
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relations
    digital_twin = relationship("DigitalTwin", back_populates="simulations")