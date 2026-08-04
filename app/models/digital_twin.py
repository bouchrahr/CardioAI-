from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.db import Base


class DigitalTwin(Base):
    """
    Le DigitalTwin est la synthèse clinique d'un examen IRM cardiaque.

    Il combine deux frames (ED + ES) segmentées par nnU-Net pour produire
    les indicateurs cliniques standards :
      - EDV (End-Diastolic Volume)   : volume LV en diastole (max)
      - ESV (End-Systolic Volume)    : volume LV en systole (min)
      - Stroke Volume                : EDV - ESV
      - Ejection Fraction (EF)       : (EDV - ESV) / EDV × 100

    Les champs "avancés" (activation_map, prédictions LSTM, embedding de fusion)
    étaient prévus dans le design initial mais NE SONT PAS implémentés dans
    cette version. Ils restent nullable et vides — documenté honnêtement.
    """
    __tablename__ = "digital_twins"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # ── Sources IRM (les deux frames) ──────────────────────────
    mri_scan_ed_id = Column(Integer, ForeignKey("mri_scans.id"), nullable=True)  # frame ED
    mri_scan_es_id = Column(Integer, ForeignKey("mri_scans.id"), nullable=True)  # frame ES
    ecg_record_id = Column(Integer, ForeignKey("ecg_records.id"), nullable=True)

    # ── Statut ─────────────────────────────────────────────────
    status = Column(String, default="pending")
    # pending → building → ready → failed

    # ── RÉSULTATS CLINIQUES nnU-Net (NOUVEAU) ──────────────────
    edv_ml = Column(Float, nullable=True)              # End-Diastolic Volume LV (mL)
    esv_ml = Column(Float, nullable=True)              # End-Systolic Volume LV (mL)
    stroke_volume_ml = Column(Float, nullable=True)    # EDV - ESV (mL)
    ejection_fraction = Column(Float, nullable=True)   # EF (%)
    myocardium_mass_g = Column(Float, nullable=True)   # masse myocarde en ED (g)
    rv_edv_ml = Column(Float, nullable=True)           # volume VD en ED (mL)

    clinical_status = Column(String, nullable=True)
    # "normal" | "mildly_reduced" | "moderately_reduced" | "severely_reduced"

    # Qualité de segmentation (confiance indicative, pas un vrai Dice sans GT)
    segmentation_meta = Column(JSONB, nullable=True)   # ex: {"ed_slices": 10, "es_slices": 10}
    twin_state = Column(JSONB, nullable=True)
    # ── Champs avancés PRÉVUS MAIS NON IMPLÉMENTÉS ─────────────
    # Conservés pour compatibilité du schéma. Toujours NULL dans cette version.
    cdt_embedding = Column(JSONB, nullable=True)
    activation_map = Column(JSONB, nullable=True)
    conduction_velocity = Column(Float, nullable=True)
    prediction_7d = Column(JSONB, nullable=True)
    prediction_30d = Column(JSONB, nullable=True)
    prediction_90d = Column(JSONB, nullable=True)
    confidence_intervals = Column(JSONB, nullable=True)
    progression_risk = Column(String, nullable=True)
    progression_score = Column(Float, nullable=True)

    is_active = Column(Boolean, default=True)          # le twin le plus récent du patient
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── Relations ──────────────────────────────────────────────
    patient = relationship("Patient", back_populates="digital_twins")
    simulations = relationship("TreatmentSimulation", back_populates="digital_twin")

    # Deux foreign keys vers mri_scans → on précise foreign_keys explicitement
    mri_scan_ed = relationship("MRIScan", foreign_keys=[mri_scan_ed_id])
    mri_scan_es = relationship("MRIScan", foreign_keys=[mri_scan_es_id])