"""
create_demo_patients.py
───────────────────────
Crée 3 patients de démo aux profils de risque contrastés pour les tests
et démos jury du pipeline CardioAI.

Utilisation :
    python create_demo_patients.py
    python create_demo_patients.py --backend http://localhost:8000
    python create_demo_patients.py --doctor-email doctor@cardioai.com --doctor-password doctor123

Idempotent : si un patient existe déjà (email pris), on saute sans planter.
"""

import argparse
import sys
import requests


DEFAULT_BACKEND = "http://localhost:8000"
DEFAULT_DOCTOR_EMAIL = "doctor@cardioai.com"
DEFAULT_DOCTOR_PASSWORD = "doctor123"

# ────────────────────────────────────────────────────────────────
# Les 3 profils — choisis pour démontrer la stratification du risque
# ────────────────────────────────────────────────────────────────
DEMO_PATIENTS = [
    {
        "label": "A — Profil sain (Faible risque)",
        "email": "karim.salah@demo.cardioai.local",
        "password": "demo1234",
        "first_name": "Karim",
        "last_name": "Salah",
        "age": 35,
        "gender": "M",
        "height": 178.0,
        "weight": 75.0,
        "medical_history": "Aucun antécédent notable. Sportif occasionnel.",
        "has_diabetes": False,
        "has_hypertension": False,
        "has_vascular_disease": False,
        "previous_stroke": False,
        # Attendu CHADS-VASc = 0 → base = Faible
        # Démontre : ECG Normal → Faible → pas d'alerte (alert fatigue prevention)
    },
    {
        "label": "B — Profil à risque modéré",
        "email": "yasmine.belkacem@demo.cardioai.local",
        "password": "demo1234",
        "first_name": "Yasmine",
        "last_name": "Belkacem",
        "age": 62,
        "gender": "F",
        "height": 162.0,
        "weight": 70.0,
        "medical_history": "Hypertension traitée depuis 8 ans. Diabète type 2 sous metformine.",
        "has_diabetes": True,
        "has_hypertension": True,
        "has_vascular_disease": False,
        "previous_stroke": False,
        # Attendu CHADS-VASc = 3 (HTA + diabète + femme) → base = Eleve
    },
    {
        "label": "C — Profil à haut risque",
        "email": "mohamed.benyoucef@demo.cardioai.local",
        "password": "demo1234",
        "first_name": "Mohamed",
        "last_name": "Benyoucef",
        "age": 78,
        "gender": "M",
        "height": 170.0,
        "weight": 80.0,
        "medical_history": "AVC ischémique en 2022. HTA, diabète type 2, artériopathie périphérique.",
        "has_diabetes": True,
        "has_hypertension": True,
        "has_vascular_disease": True,
        "previous_stroke": True,
        # Attendu CHADS-VASc = 7 → base = Eleve, devient Critique sur AFib
    },
]


def login(backend: str, email: str, password: str) -> str:
    url = f"{backend}/api/auth/login"
    r = requests.post(url, json={"email": email, "password": password})
    if r.status_code != 200:
        print(f"✗ Login échec ({r.status_code}) : {r.text}")
        sys.exit(1)
    token = r.json().get("access_token")
    if not token:
        print(f"✗ Login OK mais pas de access_token dans la réponse : {r.text}")
        sys.exit(1)
    return token


def create_patient(backend: str, token: str, payload: dict) -> tuple[bool, str]:
    """Retourne (succès, message)."""
    url = f"{backend}/api/patients/"
    headers = {"Authorization": f"Bearer {token}"}
    body = {k: v for k, v in payload.items() if k != "label"}
    r = requests.post(url, json=body, headers=headers)

    if r.status_code == 200:
        pid = r.json().get("id")
        return True, f"Créé avec id={pid}"
    if r.status_code == 400 and "déjà utilisé" in r.text.lower():
        return False, "Déjà existant (skip)"
    return False, f"HTTP {r.status_code} : {r.text}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend", default=DEFAULT_BACKEND)
    parser.add_argument("--doctor-email", default=DEFAULT_DOCTOR_EMAIL)
    parser.add_argument("--doctor-password", default=DEFAULT_DOCTOR_PASSWORD)
    args = parser.parse_args()

    print(f"[Demo Patients] Backend : {args.backend}")
    print(f"[Demo Patients] Login en tant que {args.doctor_email}…")
    token = login(args.backend, args.doctor_email, args.doctor_password)
    print(f"[Demo Patients] OK\n")

    created = 0
    skipped = 0
    failed = 0
    for patient in DEMO_PATIENTS:
        print(f"→ {patient['label']}")
        print(f"   {patient['first_name']} {patient['last_name']}, "
              f"{patient['age']} ans, {patient['gender']}")
        ok, msg = create_patient(args.backend, token, patient)
        if ok:
            created += 1
            print(f"   ✓ {msg}")
        elif "Déjà existant" in msg:
            skipped += 1
            print(f"   ⊘ {msg}")
        else:
            failed += 1
            print(f"   ✗ {msg}")
        print()

    print("─" * 60)
    print(f"Résumé : {created} créé(s), {skipped} déjà existant(s), "
          f"{failed} échec(s)")
    if failed:
        sys.exit(2)


if __name__ == "__main__":
    main()