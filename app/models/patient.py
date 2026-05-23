from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database.db import Base

class Patient(Base):
    __tablename__ = "patients"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"))
    doctor_id        = Column(Integer, ForeignKey("users.id"))
    age              = Column(Integer)
    gender           = Column(String(1))
    height           = Column(Float)
    weight           = Column(Float)
    medical_history  = Column(Text)
    has_diabetes     = Column(Boolean, default=False)
    has_hypertension = Column(Boolean, default=False)
    has_vascular_disease = Column(Boolean, default=False)
    previous_stroke  = Column(Boolean, default=False)
    created_at       = Column(DateTime, server_default=func.now())

    # Nouvelles relations Digital Twin
    mri_scans     = relationship("MRIScan", back_populates="patient")
    digital_twins = relationship("DigitalTwin", back_populates="patient")
    medical_notes = relationship("MedicalNote", back_populates="patient")