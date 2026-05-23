from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.db import Base

class MedicalNote(Base):
    __tablename__ = "medical_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    note_type = Column(String, default="general")

    related_prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True)
    related_simulation_id = Column(Integer, ForeignKey("treatment_simulations.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="medical_notes")