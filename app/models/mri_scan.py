from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.db import Base

class MRIScan(Base):
    __tablename__ = "mri_scans"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Fichier
    file_path = Column(String, nullable=False)       # chemin vers le fichier DICOM/NIfTI
    file_format = Column(String, default="dicom")    # "dicom" ou "nifti"
    file_size_mb = Column(Float, nullable=True)

    # Métadonnées IRM
    scan_date = Column(DateTime, nullable=True)      # date de l'examen IRM
    scanner_type = Column(String, nullable=True)     # ex: "Siemens 3T"
    sequences = Column(JSONB, nullable=True)         # ex: {"cine": true, "t1": true}

    # Statut du traitement
    status = Column(String, default="pending")
    # pending → processing → completed → failed

    # Résultats segmentation U-Net 3D
    segmentation_path = Column(String, nullable=True)  # masques 3D sauvegardés
    lv_volume_ml = Column(Float, nullable=True)         # volume ventricule gauche
    rv_volume_ml = Column(Float, nullable=True)         # volume ventricule droit
    myocardium_mass_g = Column(Float, nullable=True)    # masse myocarde

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    patient = relationship("Patient", back_populates="mri_scans")
    digital_twins = relationship("DigitalTwin", back_populates="mri_scan")