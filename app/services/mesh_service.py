"""
Service de génération de mesh 3D à partir des masques de segmentation nnU-Net.

Pipeline standard en cardiologie computationnelle :
  masque .nii.gz → resample isotrope 1mm → marching cubes → lissage Taubin → GLB

Le GLB généré est mis en cache sur disque (à côté du masque) pour éviter
de recalculer à chaque affichage (le calcul prend 5-15s sur CPU).

Labels ACDC :
  1 = Ventricule Droit (RV)
  2 = Myocarde
  3 = Ventricule Gauche (LV)
"""
import os
import numpy as np


# Couleurs par structure (RGB)
LABELS = {
    1: [30, 136, 229],    # VD - bleu
    2: [111, 98, 224],    # Myocarde - violet
    3: [220, 38, 38],     # VG - rouge
}


def _glb_cache_path(seg_path: str) -> str:
    """Chemin du GLB en cache (même dossier, extension .glb)."""
    base = seg_path
    for ext in (".nii.gz", ".nii"):
        if base.endswith(ext):
            base = base[: -len(ext)]
            break
    return f"{base}_mesh.glb"


def generate_heart_mesh(seg_path: str, force: bool = False) -> bytes:
    """
    Génère (ou récupère depuis le cache) le mesh 3D GLB du cœur.

    Args:
        seg_path: chemin vers le masque de segmentation .nii.gz
        force: si True, régénère même si le cache existe

    Returns:
        bytes du fichier GLB
    """
    if not os.path.exists(seg_path):
        raise FileNotFoundError(f"Masque introuvable : {seg_path}")

    cache_path = _glb_cache_path(seg_path)

    # Retour depuis le cache
    if os.path.exists(cache_path) and not force:
        with open(cache_path, "rb") as f:
            return f.read()

    # Imports lourds seulement à la génération
    import nibabel as nib
    from nibabel.processing import resample_to_output
    from skimage.measure import marching_cubes
    from scipy.ndimage import gaussian_filter
    import trimesh

    # 1. Charger le masque
    img = nib.load(seg_path)

    # 2. Resample isotrope 1mm (order=0 pour garder les labels entiers)
    iso = resample_to_output(img, [1, 1, 1], order=0)
    data = iso.get_fdata().astype(np.uint8)

    # 3. Marching cubes par structure
    scene = trimesh.Scene()
    structures_added = 0

    for label, color in LABELS.items():
        mask = (data == label).astype(np.float32)
        if mask.sum() == 0:
            continue

        # Lissage du masque binaire avant MC (surface plus douce)
        mask = gaussian_filter(mask, sigma=1.0)

        try:
            verts, faces, normals, _ = marching_cubes(mask, level=0.5)
        except (ValueError, RuntimeError):
            # Structure trop petite ou dégénérée
            continue

        mesh = trimesh.Trimesh(vertices=verts, faces=faces, vertex_normals=normals)

        # Lissage Taubin (pas de rétrécissement, contrairement au Laplacien simple)
        trimesh.smoothing.filter_taubin(mesh, iterations=15)

        # Couleur
        mesh.visual.vertex_colors = np.tile(
            np.array(color + [255], dtype=np.uint8), (len(mesh.vertices), 1)
        )

        scene.add_geometry(mesh, node_name=f"label_{label}")
        structures_added += 1

    if structures_added == 0:
        raise ValueError("Aucune structure segmentée trouvée dans le masque.")

    # 4. Centrer la scène à l'origine
    scene.apply_translation(-scene.centroid)

    # 5. Export GLB
    glb_bytes = scene.export(file_type="glb")

    # 6. Sauvegarde en cache
    try:
        with open(cache_path, "wb") as f:
            f.write(glb_bytes)
    except Exception:
        pass  # cache best-effort, non bloquant

    return glb_bytes