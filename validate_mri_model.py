"""
Script de validation standalone du modèle nnU-Net 2D pour segmentation IRM cardiaque ACDC.

Objectif :
- Charger le checkpoint entraîné (Dice annoncé 0.9229)
- Lancer l'inférence sur une IRM de test
- Comparer au ground truth
- Vérifier qu'on retrouve un Dice cohérent (~0.90-0.93)

Usage :
    python validate_mri_model.py
"""

import os
import shutil
import tempfile
from pathlib import Path

import numpy as np
import nibabel as nib
import torch

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent.resolve()

# Chemins des fichiers modèle
MODEL_DIR = BASE_DIR / "models" / "mri" / "nnUNetTrainer__nnUNetPlans__2d"
CHECKPOINT_PATH = MODEL_DIR / "fold_0" / "checkpoint_best.pth"
PLANS_PATH = MODEL_DIR / "plans.json"
DATASET_JSON_PATH = MODEL_DIR / "dataset.json"

# Chemins des données de test
TEST_DIR = BASE_DIR / "test_data" / "mri"
INPUT_IMAGE = TEST_DIR / "ACDC_009_ES_0000.nii.gz"
GT_MASK = TEST_DIR / "ACDC_009_ES_gt.nii.gz"
PRED_MASK = TEST_DIR / "ACDC_009_ES_pred.nii.gz"

# Labels ACDC
LABELS = {0: "background", 1: "RV", 2: "MYO", 3: "LV"}


# ---------------------------------------------------------------------------
# VÉRIFICATIONS PRÉLIMINAIRES
# ---------------------------------------------------------------------------

def check_files():
    print("=" * 70)
    print("VÉRIFICATION DES FICHIERS")
    print("=" * 70)

    required = {
        "Checkpoint": CHECKPOINT_PATH,
        "plans.json": PLANS_PATH,
        "dataset.json": DATASET_JSON_PATH,
        "IRM test": INPUT_IMAGE,
        "GT mask": GT_MASK,
    }

    all_ok = True
    for label, path in required.items():
        exists = path.exists()
        size_mb = path.stat().st_size / (1024 * 1024) if exists else 0
        status = f"OK ({size_mb:.2f} MB)" if exists else "MANQUANT"
        marker = "[OK]" if exists else "[X]"
        print(f"  {marker} {label:15s} : {path}  --> {status}")
        if not exists:
            all_ok = False

    if not all_ok:
        raise FileNotFoundError("Fichiers manquants, arrêt.")

    print()


# ---------------------------------------------------------------------------
# INFÉRENCE nnU-Net
# ---------------------------------------------------------------------------

def run_inference():
    print("=" * 70)
    print("INFÉRENCE nnU-Net 2D")
    print("=" * 70)

    # nnU-Net v2 attend une structure input_folder/output_folder
    # avec des fichiers nommés {case}_0000.nii.gz (channel 0)
    # On copie l'image dans un dossier temporaire propre

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_input = Path(tmp_dir) / "input"
        tmp_output = Path(tmp_dir) / "output"
        tmp_input.mkdir()
        tmp_output.mkdir()

        # Copier l'image d'entrée (format nnU-Net: case_0000.nii.gz)
        shutil.copy(INPUT_IMAGE, tmp_input / "ACDC_009_ES_0000.nii.gz")
        print(f"  Image copiée dans dossier temporaire")

        # Import ici pour ne pas ralentir le démarrage si les fichiers manquent
        from nnunetv2.inference.predict_from_raw_data import nnUNetPredictor

        print(f"  Initialisation nnUNetPredictor...")
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"  Device : {device}")

        predictor = nnUNetPredictor(
            tile_step_size=0.5,
            use_gaussian=True,
            use_mirroring=True,
            perform_everything_on_device=True,
            device=device,
            verbose=False,
            verbose_preprocessing=False,
            allow_tqdm=True,
        )

        # Charger le modèle depuis notre dossier local
        # initialize_from_trained_model_folder attend :
        #   - un dossier avec plans.json + dataset.json à la racine
        #   - un ou plusieurs sous-dossiers fold_X avec checkpoint_final.pth OU checkpoint_best.pth
        print(f"  Chargement du modèle depuis : {MODEL_DIR}")

        predictor.initialize_from_trained_model_folder(
            str(MODEL_DIR),
            use_folds=("0",),
            checkpoint_name="checkpoint_best.pth",
        )
        print(f"  [OK] Modèle chargé")

        # Lancer la prédiction
        print(f"  Lancement de l'inférence (peut prendre 1-3 minutes sur CPU)...")
        predictor.predict_from_files(
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

        # Récupérer le masque prédit
        predicted_files = list(tmp_output.glob("*.nii.gz"))
        if not predicted_files:
            raise RuntimeError("Aucun masque prédit trouvé dans le dossier de sortie.")

        predicted_file = predicted_files[0]
        print(f"  [OK] Masque prédit : {predicted_file.name}")

        # Copier vers notre dossier de test pour inspection ultérieure
        shutil.copy(predicted_file, PRED_MASK)
        print(f"  [OK] Masque sauvegardé : {PRED_MASK}")

    print()


# ---------------------------------------------------------------------------
# CALCUL DU DICE
# ---------------------------------------------------------------------------

def dice_score(pred: np.ndarray, gt: np.ndarray, class_id: int) -> float:
    """Dice score pour une classe donnée."""
    pred_bin = (pred == class_id).astype(np.float32)
    gt_bin = (gt == class_id).astype(np.float32)

    intersection = np.sum(pred_bin * gt_bin)
    total = np.sum(pred_bin) + np.sum(gt_bin)

    if total == 0:
        return float("nan")  # classe absente des deux côtés

    return (2.0 * intersection) / total


def evaluate():
    print("=" * 70)
    print("ÉVALUATION DICE")
    print("=" * 70)

    pred = nib.load(PRED_MASK).get_fdata().astype(np.int32)
    gt = nib.load(GT_MASK).get_fdata().astype(np.int32)

    print(f"  Shape prédiction : {pred.shape}")
    print(f"  Shape GT         : {gt.shape}")
    print(f"  Labels prédits   : {sorted(np.unique(pred).tolist())}")
    print(f"  Labels GT        : {sorted(np.unique(gt).tolist())}")
    print()

    if pred.shape != gt.shape:
        raise ValueError(
            f"Shapes différentes entre prédiction {pred.shape} et GT {gt.shape}"
        )

    # Dice par classe (on ignore le background pour la moyenne)
    dices = {}
    for class_id, name in LABELS.items():
        d = dice_score(pred, gt, class_id)
        dices[name] = d

    print(f"  {'Classe':<15s} | {'Dice':>8s}")
    print(f"  {'-'*15} | {'-'*8}")
    for name, d in dices.items():
        if np.isnan(d):
            print(f"  {name:<15s} | {'N/A':>8s}")
        else:
            print(f"  {name:<15s} | {d:>8.4f}")

    # Dice moyen sur les classes foreground (RV, MYO, LV)
    fg_dices = [d for name, d in dices.items() if name != "background" and not np.isnan(d)]
    if fg_dices:
        mean_dice = np.mean(fg_dices)
        print(f"  {'-'*15} | {'-'*8}")
        print(f"  {'MEAN (fg)':<15s} | {mean_dice:>8.4f}")
        print()

        # Verdict
        if mean_dice >= 0.85:
            print(f"  [OK] Dice moyen = {mean_dice:.4f} --> excellent, modèle validé")
        elif mean_dice >= 0.70:
            print(f"  [WARN] Dice moyen = {mean_dice:.4f} --> acceptable mais en-dessous des attentes (~0.92)")
        else:
            print(f"  [X] Dice moyen = {mean_dice:.4f} --> trop bas, il y a un problème")

    print()


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    print()
    check_files()
    run_inference()
    evaluate()
    print("Terminé.")


if __name__ == "__main__":
    main()