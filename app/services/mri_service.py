"""
Service de segmentation IRM cardiaque via nnU-Net 2D.

Responsabilités :
  1. Charger le modèle nnU-Net UNE SEULE FOIS (au démarrage FastAPI).
  2. Segmenter une frame IRM (.nii.gz) → masque 3D (RV/MYO/LV).
  3. Calculer les volumes cardiaques à partir d'un masque + spacing.
  4. Orchestrer l'analyse d'une paire ED+ES → Ejection Fraction + statut clinique.

Labels ACDC : 0=background, 1=RV, 2=MYO, 3=LV
"""

import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional

import numpy as np
import nibabel as nib
import torch


# ── Configuration ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # .../backend
MODEL_DIR = BASE_DIR / "models" / "mri" / "nnUNetTrainer_100epochs__nnUNetPlans__2d"
CHECKPOINT_NAME = "checkpoint_best.pth"

# Labels
LABEL_RV = 1
LABEL_MYO = 2
LABEL_LV = 3

# Densité du myocarde (standard cardiologie) pour convertir volume → masse
MYOCARDIUM_DENSITY_G_PER_ML = 1.05

# Seuils cliniques Ejection Fraction (ESC 2023)
def classify_ef(ef: float) -> str:
    if ef >= 50:
        return "normal"
    elif ef >= 40:
        return "mildly_reduced"
    elif ef >= 30:
        return "moderately_reduced"
    else:
        return "severely_reduced"


class MRISegmentationService:
    """Wrapper singleton autour de nnU-Net v2."""

    def __init__(self):
        self.predictor = None
        self._loaded = False

    def load_model(self):
        """
        Charge le modèle nnU-Net. À appeler une seule fois au démarrage.
        Idempotent : un second appel ne recharge pas.
        """
        if self._loaded:
            return

        if not MODEL_DIR.exists():
            print(f"[MRI] ATTENTION : dossier modèle introuvable : {MODEL_DIR}")
            print(f"[MRI] Le service IRM sera indisponible.")
            return

        checkpoint = MODEL_DIR / "fold_0" / CHECKPOINT_NAME
        if not checkpoint.exists():
            print(f"[MRI] ATTENTION : checkpoint introuvable : {checkpoint}")
            print(f"[MRI] Le service IRM sera indisponible.")
            return

        try:
            from nnunetv2.inference.predict_from_raw_data import nnUNetPredictor

            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            use_device_flag = torch.cuda.is_available()

            self.predictor = nnUNetPredictor(
                tile_step_size=0.5,
                use_gaussian=True,
                use_mirroring=True,
                perform_everything_on_device=use_device_flag,
                device=device,
                verbose=False,
                verbose_preprocessing=False,
                allow_tqdm=False,
            )

            self.predictor.initialize_from_trained_model_folder(
                str(MODEL_DIR),
                use_folds=("0",),
                checkpoint_name=CHECKPOINT_NAME,
            )

            self._loaded = True
            print(f"[MRI] Modèle nnU-Net chargé avec succès (device={device}).")

        except Exception as e:
            print(f"[MRI] ERREUR au chargement du modèle nnU-Net : {e}")
            self.predictor = None
            self._loaded = False

    @property
    def is_available(self) -> bool:
        return self._loaded and self.predictor is not None

    # ── Segmentation d'une frame ───────────────────────────────

    def predict(self, nii_path: str, output_seg_path: Optional[str] = None) -> dict:
        """
        Segmente une frame IRM.

        Args:
            nii_path: chemin du fichier .nii.gz d'entrée
            output_seg_path: si fourni, sauvegarde le masque prédit à cet endroit

        Returns:
            {
              "mask": np.ndarray (H, W, D) int,
              "spacing": tuple(float, float, float) en mm,
              "affine": np.ndarray 4x4,
              "n_slices": int,
              "seg_path": str | None
            }
        """
        if not self.is_available:
            raise RuntimeError("Le modèle nnU-Net n'est pas chargé.")

        nii_path = str(nii_path)
        if not os.path.exists(nii_path):
            raise FileNotFoundError(f"Fichier IRM introuvable : {nii_path}")

        # Lire le spacing et l'affine de l'image d'origine
        img = nib.load(nii_path)
        spacing = tuple(float(z) for z in img.header.get_zooms()[:3])
        affine = img.affine
        n_slices = img.shape[2] if img.ndim >= 3 else 1

        # nnU-Net attend un dossier avec des fichiers {case}_0000.nii.gz
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_input = Path(tmp_dir) / "input"
            tmp_output = Path(tmp_dir) / "output"
            tmp_input.mkdir()
            tmp_output.mkdir()

            case_name = "case_0000.nii.gz"
            shutil.copy(nii_path, tmp_input / case_name)

            self.predictor.predict_from_files(
                list_of_lists_or_source_folder=str(tmp_input),
                output_folder_or_list_of_truncated_output_files=str(tmp_output),
                save_probabilities=False,
                overwrite=True,
                num_processes_preprocessing=1,
                num_processes_segmentation_export=1,
                folder_with_segs_from_prev_stage=None,
                num_parts=1,
                part_id=0,
            )

            pred_files = list(tmp_output.glob("*.nii.gz"))
            if not pred_files:
                raise RuntimeError("nnU-Net n'a produit aucun masque.")

            pred_nii = nib.load(pred_files[0])
            mask = pred_nii.get_fdata().astype(np.int32)

            seg_path = None
            if output_seg_path:
                os.makedirs(os.path.dirname(output_seg_path), exist_ok=True)
                shutil.copy(pred_files[0], output_seg_path)
                seg_path = output_seg_path

        return {
            "mask": mask,
            "spacing": spacing,
            "affine": affine,
            "n_slices": int(n_slices),
            "seg_path": seg_path,
        }

    # ── Calcul des volumes ─────────────────────────────────────

    @staticmethod
    def compute_volumes(mask: np.ndarray, spacing: tuple) -> dict:
        """
        Calcule les volumes cardiaques à partir d'un masque segmenté.

        volume (mL) = nb_voxels × volume_d_un_voxel(mm³) / 1000

        Args:
            mask: np.ndarray de labels (0,1,2,3)
            spacing: (sx, sy, sz) en mm

        Returns:
            {"lv_ml", "rv_ml", "myo_ml", "myo_mass_g", "voxel_volume_mm3"}
        """
        sx, sy, sz = spacing
        voxel_volume_mm3 = sx * sy * sz

        n_lv = int(np.sum(mask == LABEL_LV))
        n_rv = int(np.sum(mask == LABEL_RV))
        n_myo = int(np.sum(mask == LABEL_MYO))

        lv_ml = n_lv * voxel_volume_mm3 / 1000.0
        rv_ml = n_rv * voxel_volume_mm3 / 1000.0
        myo_ml = n_myo * voxel_volume_mm3 / 1000.0
        myo_mass_g = myo_ml * MYOCARDIUM_DENSITY_G_PER_ML

        return {
            "lv_ml": round(lv_ml, 2),
            "rv_ml": round(rv_ml, 2),
            "myo_ml": round(myo_ml, 2),
            "myo_mass_g": round(myo_mass_g, 2),
            "voxel_volume_mm3": round(voxel_volume_mm3, 4),
        }


# ── Singleton global ───────────────────────────────────────────
mri_service = MRISegmentationService()


# ── Orchestration : analyse d'une paire ED + ES ────────────────

def analyze_mri_pair(
    ed_path: str,
    es_path: str,
    ed_seg_out: Optional[str] = None,
    es_seg_out: Optional[str] = None,
) -> dict:
    """
    Analyse complète d'un examen IRM (ED + ES) → indicateurs cliniques.

    Returns un dict avec toutes les valeurs à stocker dans MRIScan + DigitalTwin.
    """
    if not mri_service.is_available:
        raise RuntimeError("Service nnU-Net indisponible.")

    # 1. Segmenter ED
    ed_result = mri_service.predict(ed_path, output_seg_path=ed_seg_out)
    ed_vols = mri_service.compute_volumes(ed_result["mask"], ed_result["spacing"])

    # 2. Segmenter ES
    es_result = mri_service.predict(es_path, output_seg_path=es_seg_out)
    es_vols = mri_service.compute_volumes(es_result["mask"], es_result["spacing"])

    # 3. Indicateurs cliniques
    edv = ed_vols["lv_ml"]   # volume LV en diastole (max)
    esv = es_vols["lv_ml"]   # volume LV en systole (min)

    stroke_volume = edv - esv
    ejection_fraction = (stroke_volume / edv * 100.0) if edv > 0 else 0.0
    clinical_status = classify_ef(ejection_fraction)

    return {
        # Frame ED
        "ed": {
            "lv_volume_ml": ed_vols["lv_ml"],
            "rv_volume_ml": ed_vols["rv_ml"],
            "myocardium_mass_g": ed_vols["myo_mass_g"],
            "spacing": list(ed_result["spacing"]),
            "n_slices": ed_result["n_slices"],
            "seg_path": ed_result["seg_path"],
        },
        # Frame ES
        "es": {
            "lv_volume_ml": es_vols["lv_ml"],
            "rv_volume_ml": es_vols["rv_ml"],
            "myocardium_mass_g": es_vols["myo_mass_g"],
            "spacing": list(es_result["spacing"]),
            "n_slices": es_result["n_slices"],
            "seg_path": es_result["seg_path"],
        },
        # Synthèse clinique (pour DigitalTwin)
        "clinical": {
            "edv_ml": round(edv, 2),
            "esv_ml": round(esv, 2),
            "stroke_volume_ml": round(stroke_volume, 2),
            "ejection_fraction": round(ejection_fraction, 2),
            "myocardium_mass_g": ed_vols["myo_mass_g"],
            "rv_edv_ml": ed_vols["rv_ml"],
            "clinical_status": clinical_status,
        },
    }