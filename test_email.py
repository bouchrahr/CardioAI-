"""
Test standalone de l'envoi d'email via Brevo.
Usage : python test_email.py <email_destinataire>

Ex :   python test_email.py b.harrath@esi-sba.dz
"""

import sys
import time
from dotenv import load_dotenv
load_dotenv()

from app.services.email_service import send_alert_email_async, reset_cooldown


def test():
    if len(sys.argv) != 2:
        print("Usage : python test_email.py <email_destinataire>")
        sys.exit(1)

    recipient = sys.argv[1]
    print(f"🔧 Envoi d'un email de test à {recipient}...\n")

    # Reset du cooldown pour être sûr
    reset_cooldown()

    # Simule les données d'une vraie alerte
    success = send_alert_email_async(
        doctor_email=recipient,
        doctor_name="Ahmed Benali",
        patient_name="Mohamed Benyoucef",
        patient_id=19,
        alert_type="AFib_Detected",
        severity="Critical",
        predicted_class="AFib",
        confidence=0.921,
        risk_level="Critique",
        chadsvasc_score=7,
        message="[Temps réel] Patient 19 — AFib détecté (confiance 92%). "
                "CHADS-VASc 7/9, risque Critique.",
    )

    if success:
        print("✅ Envoi déclenché — attente 5s pour laisser le thread finir...")
        time.sleep(5)
        print("\n👉 Vérifie ta boîte de réception (et les spams).")
        print("👉 Vérifie aussi le dashboard Brevo → Transactional → Statistics")
    else:
        print("❌ Envoi bloqué (cooldown ou config manquante)")


if __name__ == "__main__":
    test()