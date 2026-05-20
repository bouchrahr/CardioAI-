# Table "alerts" — alertes envoyées au médecin

from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database.db import Base

class Alert(Base):
    __tablename__ = "alerts"

    id            = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"))
    patient_id    = Column(Integer, ForeignKey("patients.id"))
    doctor_id     = Column(Integer, ForeignKey("users.id"))
    alert_type    = Column(String)   # 'AFib_Detected', 'Critical_Risk', 'High_Risk'
    severity      = Column(String)   # 'Low', 'Medium', 'High', 'Critical'
    message       = Column(Text)
    is_read       = Column(Boolean, default=False)
    email_sent    = Column(Boolean, default=False)
    created_at    = Column(DateTime, server_default=func.now())