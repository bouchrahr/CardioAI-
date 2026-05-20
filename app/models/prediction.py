# Table "predictions" — résultats de l'analyse IA

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database.db import Base

class Prediction(Base):
    __tablename__ = "predictions"

    id              = Column(Integer, primary_key=True, index=True)
    ecg_record_id   = Column(Integer, ForeignKey("ecg_records.id"))
    predicted_class = Column(String)   # 'Normal', 'AFib', 'Other'
    confidence      = Column(Float)    # 0.0 à 1.0
    probabilities   = Column(JSONB)    # {"Normal": 0.03, "AFib": 0.94, "Other": 0.03}
    chadsvasc_score = Column(Integer)  # 0 à 9
    risk_level      = Column(String)   # 'Faible', 'Modéré', 'Élevé', 'Critique'
    risk_immediate  = Column(String)   # 'Stable', 'Attention', 'Urgent', 'Critique'
    avc_risk_12m    = Column(Float)    # % risque AVC dans 12 mois
    llm_report      = Column(Text)     # rapport médical généré par Groq
    attention_map   = Column(JSONB)    # heatmap du Transformer
    created_at      = Column(DateTime, server_default=func.now())