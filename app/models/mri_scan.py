from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.db import Base


class MRIScan(Base):
    """
    Un MRIScan représente UNE frame IRM cardiaque (soit End-Diastole, soit End-Systole).

    Un examen IRM complet ACDC fournit deux frames par patient :
      - ED (End-Diastole) : cœur rempli au maximum
      - ES (End-Systole)  : cœur contracté au minimum

    Chaque frame est segmentée indépendamment par nnU-Net et possède ses propres volumes.
    Le DigitalTwin combine ensuite les deux frames pour calculer l'Ejection Fraction.
    """
    __tablename__ = "mri_scans"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # ── Fichier ────────────────────────────────────────────────
    file_path = Column(String, nullable=False)       # chemin vers le fichier NIfTI d'origine
    file_format = Column(String, default="nii.gz")   # "nii.gz"
    file_size_mb = Column(Float, nullable=True)

    # ── Type de frame (NOUVEAU) ────────────────────────────────
    frame_type = Column(String, nullable=True)       # "ED" ou "ES"

    # ── Métadonnées IRM ────────────────────────────────────────
    scan_date = Column(DateTime, nullable=True)      # date de l'examen IRM
    scanner_type = Column(String, nullable=True)     # ex: "Siemens 3T"
    sequences = Column(JSONB, nullable=True)         # ex: {"cine": true}

    # ── Statut du traitement ───────────────────────────────────
    status = Column(String, default="pending")
    # pending → processing → completed → failed

    # ── Résultats segmentation nnU-Net ─────────────────────────
    segmentation_path = Column(String, nullable=True)  # masque prédit sauvegardé (.nii.gz)
    lv_volume_ml = Column(Float, nullable=True)         # volume ventricule gauche (mL)
    rv_volume_ml = Column(Float, nullable=True)         # volume ventricule droit (mL)
    myocardium_mass_g = Column(Float, nullable=True)    # masse myocarde (g)

    # ── Info spacing (pour traçabilité / honnêteté scientifique) ──
    voxel_spacing = Column(JSONB, nullable=True)     # ex: [1.5, 1.5, 10.0] en mm

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── Relations ──────────────────────────────────────────────
    patient = relationship("Patient", back_populates="mri_scans")

    # Un MRIScan peut être référencé comme frame ED ou ES d'un DigitalTwin.
    # On désactive les back_populates automatiques ici pour éviter l'ambiguïté
    # des deux foreign keys (mri_scan_ed_id / mri_scan_es_id) côté DigitalTwin.