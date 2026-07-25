"""
Service email transactionnel via Brevo (ex-Sendinblue).

Architecture :
  - Envoi non-bloquant : chaque email part dans un thread séparé pour ne pas
    bloquer le pipeline MQTT temps réel (l'API Brevo peut prendre 1-3s).
  - Cooldown anti-spam : max 1 email d'alerte par patient toutes les N minutes,
    pour éviter le harcèlement du médecin si une arythmie persiste.
  - Gestion d'erreur silencieuse : si l'envoi échoue, on log mais on NE plante
    JAMAIS le pipeline appelant.

API Brevo utilisée : POST https://api.brevo.com/v3/smtp/email
Documentation : https://developers.brevo.com/reference/sendtransacemail
"""

import os
import threading
import time
from datetime import datetime
from typing import Dict

import requests

# ─────────────────────────────────────────────────────────────────
# Configuration (depuis .env)
# ─────────────────────────────────────────────────────────────────
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "CardioAI System")
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

# Cooldown anti-spam : combien de secondes minimum entre deux alertes du même patient
ALERT_COOLDOWN_SECONDS = 300  # 5 minutes

# Timestamps du dernier email d'alerte envoyé par patient
# {patient_id: timestamp_dernier_envoi}
_last_alert_sent: Dict[int, float] = {}
_cooldown_lock = threading.Lock()


# ─────────────────────────────────────────────────────────────────
# Palette de couleurs par sévérité (pour le template HTML)
# ─────────────────────────────────────────────────────────────────
SEVERITY_STYLE = {
    "Medium":   {"color": "#F59E0B", "label": "MODÉRÉ",  "emoji": "⚠️"},
    "High":     {"color": "#EF4444", "label": "ÉLEVÉ",   "emoji": "🔴"},
    "Critical": {"color": "#991B1B", "label": "CRITIQUE", "emoji": "🚨"},
}


# ─────────────────────────────────────────────────────────────────
# Template HTML de l'email d'alerte
# ─────────────────────────────────────────────────────────────────
def _build_alert_html(
    doctor_name: str,
    patient_name: str,
    patient_id: int,
    alert_type: str,
    severity: str,
    predicted_class: str,
    confidence: float,
    risk_level: str,
    chadsvasc_score: int,
    message: str,
    timestamp: str,
) -> str:
    """Construit le corps HTML de l'email d'alerte."""

    style = SEVERITY_STYLE.get(severity, SEVERITY_STYLE["Medium"])

    return f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Alerte CardioAI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #EEF2F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #EEF2F7; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                    <!-- Bandeau de sévérité -->
                    <tr>
                        <td style="background-color: {style['color']}; padding: 24px 32px; color: white;">
                            <div style="font-size: 14px; letter-spacing: 2px; opacity: 0.9;">CARDIOAI — ALERTE {style['label']}</div>
                            <div style="font-size: 28px; font-weight: 700; margin-top: 8px;">
                                {style['emoji']} {predicted_class} détecté
                            </div>
                        </td>
                    </tr>

                    <!-- Corps -->
                    <tr>
                        <td style="padding: 32px;">
                            <p style="font-size: 16px; color: #1F2937; margin: 0 0 24px 0;">
                                Bonjour Dr. {doctor_name},
                            </p>

                            <p style="font-size: 15px; color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
                                Une anomalie cardiaque a été détectée automatiquement par le système
                                CardioAI sur l'un de vos patients. Une intervention peut être requise.
                            </p>

                            <!-- Tableau des détails -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                                <tr style="background-color: #F9FAFB;">
                                    <td style="padding: 12px 16px; font-size: 13px; color: #6B7280; font-weight: 600; width: 40%;">Patient</td>
                                    <td style="padding: 12px 16px; font-size: 14px; color: #1F2937;">{patient_name} <span style="color: #9CA3AF;">(#{patient_id})</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; font-size: 13px; color: #6B7280; font-weight: 600; border-top: 1px solid #E5E7EB;">Anomalie</td>
                                    <td style="padding: 12px 16px; font-size: 14px; color: #1F2937; border-top: 1px solid #E5E7EB;">{predicted_class}</td>
                                </tr>
                                <tr style="background-color: #F9FAFB;">
                                    <td style="padding: 12px 16px; font-size: 13px; color: #6B7280; font-weight: 600; border-top: 1px solid #E5E7EB;">Confiance du modèle</td>
                                    <td style="padding: 12px 16px; font-size: 14px; color: #1F2937; border-top: 1px solid #E5E7EB;">{confidence:.1%}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; font-size: 13px; color: #6B7280; font-weight: 600; border-top: 1px solid #E5E7EB;">Niveau de risque</td>
                                    <td style="padding: 12px 16px; font-size: 14px; color: {style['color']}; font-weight: 600; border-top: 1px solid #E5E7EB;">{risk_level}</td>
                                </tr>
                                <tr style="background-color: #F9FAFB;">
                                    <td style="padding: 12px 16px; font-size: 13px; color: #6B7280; font-weight: 600; border-top: 1px solid #E5E7EB;">Score CHADS-VASc</td>
                                    <td style="padding: 12px 16px; font-size: 14px; color: #1F2937; border-top: 1px solid #E5E7EB;">{chadsvasc_score} / 9</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; font-size: 13px; color: #6B7280; font-weight: 600; border-top: 1px solid #E5E7EB;">Détecté à</td>
                                    <td style="padding: 12px 16px; font-size: 14px; color: #1F2937; border-top: 1px solid #E5E7EB;">{timestamp} UTC</td>
                                </tr>
                            </table>

                            <p style="font-size: 14px; color: #4B5563; line-height: 1.6; margin: 0 0 32px 0; padding: 16px; background-color: #F3F4F6; border-left: 4px solid {style['color']}; border-radius: 4px;">
                                <em>{message}</em>
                            </p>

                            <!-- CTA -->
                            <div style="text-align: center; margin-bottom: 24px;">
                                <a href="http://localhost:5173/monitoring/{patient_id}"
                                   style="background-color: #1E88E5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 15px;">
                                    Voir le patient sur CardioAI →
                                </a>
                            </div>

                            <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0;">
                                Cet email est généré automatiquement — merci de ne pas y répondre.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F9FAFB; padding: 16px 32px; border-top: 1px solid #E5E7EB;">
                            <p style="font-size: 12px; color: #6B7280; margin: 0; text-align: center;">
                                CardioAI — Plateforme de monitoring cardiaque temps réel<br>
                                ESI SBA — Projet de Fin d'Études
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


# ─────────────────────────────────────────────────────────────────
# Envoi bas niveau (bloquant, appelé dans un thread)
# ─────────────────────────────────────────────────────────────────
def _send_email_sync(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
) -> bool:
    """
    Envoie effectivement l'email via l'API Brevo. BLOQUANT.
    Retourne True si succès, False sinon (mais ne lève JAMAIS d'exception).
    """
    if not BREVO_API_KEY:
        print("[EMAIL] ❌ BREVO_API_KEY absente du .env — email non envoyé")
        return False

    payload = {
        "sender": {
            "name":  BREVO_SENDER_NAME,
            "email": BREVO_SENDER_EMAIL,
        },
        "to": [
            {"email": to_email, "name": to_name}
        ],
        "subject": subject,
        "htmlContent": html_content,
    }
    headers = {
        "accept":       "application/json",
        "content-type": "application/json",
        "api-key":      BREVO_API_KEY,
    }

    try:
        response = requests.post(
            BREVO_API_URL,
            json=payload,
            headers=headers,
            timeout=10,
        )
        if response.status_code in (200, 201):
            msg_id = response.json().get("messageId", "?")
            print(f"[EMAIL] ✅ Envoyé à {to_email} (messageId={msg_id})")
            return True
        else:
            print(f"[EMAIL] ❌ Échec ({response.status_code}) : {response.text[:200]}")
            return False
    except requests.RequestException as e:
        print(f"[EMAIL] ❌ Exception réseau : {e}")
        return False
    except Exception as e:
        print(f"[EMAIL] ❌ Exception inattendue : {e}")
        return False


# ─────────────────────────────────────────────────────────────────
# API publique : envoi d'une alerte médicale
# ─────────────────────────────────────────────────────────────────
def send_alert_email_async(
    doctor_email: str,
    doctor_name: str,
    patient_name: str,
    patient_id: int,
    alert_type: str,
    severity: str,
    predicted_class: str,
    confidence: float,
    risk_level: str,
    chadsvasc_score: int,
    message: str,
) -> bool:
    """
    Envoie une alerte email au médecin, DE FAÇON NON-BLOQUANTE.

    Comportement :
      - Vérifie le cooldown (max 1 email / patient / 5 min)
      - Si OK : lance un thread daemon qui envoie l'email en arrière-plan
      - Retourne immédiatement True si l'envoi a été DÉCLENCHÉ,
        False si bloqué par cooldown ou données manquantes.

    Note : le retour True ne garantit PAS que l'email est arrivé,
    juste qu'il a été envoyé à l'API Brevo. Pour vérifier réellement,
    consulter le dashboard Brevo.
    """
    # 1. Validation des données minimales
    if not doctor_email:
        print(f"[EMAIL] ⚠️ Pas d'email pour ce médecin — patient {patient_id}, alerte ignorée")
        return False

    # 2. Cooldown anti-spam (thread-safe)
    now = time.time()
    with _cooldown_lock:
        last = _last_alert_sent.get(patient_id, 0)
        if now - last < ALERT_COOLDOWN_SECONDS:
            remaining = int(ALERT_COOLDOWN_SECONDS - (now - last))
            print(f"[EMAIL] ⏳ Cooldown actif pour patient {patient_id} "
                  f"({remaining}s restants) — email non envoyé")
            return False
        _last_alert_sent[patient_id] = now

    # 3. Construction de l'email
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    html = _build_alert_html(
        doctor_name=doctor_name,
        patient_name=patient_name,
        patient_id=patient_id,
        alert_type=alert_type,
        severity=severity,
        predicted_class=predicted_class,
        confidence=confidence,
        risk_level=risk_level,
        chadsvasc_score=chadsvasc_score,
        message=message,
        timestamp=timestamp,
    )

    subject = f"[CardioAI] Alerte {severity} — {predicted_class} détecté (Patient #{patient_id})"

    # 4. Envoi dans un thread séparé (non-bloquant pour le pipeline MQTT)
    thread = threading.Thread(
        target=_send_email_sync,
        args=(doctor_email, doctor_name, subject, html),
        daemon=True,
    )
    thread.start()

    return True


# ─────────────────────────────────────────────────────────────────
# Reset cooldown (utile pour les tests)
# ─────────────────────────────────────────────────────────────────
def reset_cooldown(patient_id: int = None):
    """Vide le cooldown (pour tests ou reset manuel)."""
    with _cooldown_lock:
        if patient_id is None:
            _last_alert_sent.clear()
        else:
            _last_alert_sent.pop(patient_id, None)