"""
Service MQTT — pipeline temps réel CardioAI.

Architecture :
  Passerelle (USB série ou simulateur) -> MQTT topic cardioai/ecg/{patient_id}
  -> _on_message bufferise par patient
  -> dès que le buffer atteint 1000 points :
       predict_ecg -> calculate_chadsvasc
       -> ECGRecord + Prediction en DB
       -> Alert si risque ≥ Modéré
       -> log_action("ECG_AUTO_ANALYSIS")
       -> forward du résultat via WebSocket vers le frontend

NOTE THREADING : paho-mqtt utilise UN seul thread pour tous les callbacks
on_message. Donc le buffer Python (dict) n'a pas besoin de Lock — un seul
thread écrit/lit dedans. predict_ecg() est synchrone (~50-200ms par fenêtre)
et bloque ce thread pendant l'inférence : acceptable pour PFE, à mentionner
comme limite dans le mémoire si plusieurs patients en simultané.
"""

import paho.mqtt.client as mqtt
import json
import asyncio
import os
from datetime import datetime
from typing import Dict, List

import numpy as np

from app.database.db import SessionLocal
from app.models.patient import Patient
from app.models.ecg_record import ECGRecord
from app.models.prediction import Prediction
from app.models.alert import Alert
from app.services.ai_service import predict_ecg
from app.services.risk_engine import calculate_chadsvasc
from app.services.logging_service import log_action

# ─────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC_ECG = "cardioai/ecg/+"   # wildcard : tous les patients
WINDOW_SIZE = 1000                   # 10 secondes à 100 Hz
SAMPLE_RATE = 100                    # Hz — aligné PTB-XL
UPLOAD_DIR = "./uploads/ecg_files"

os.makedirs(UPLOAD_DIR, exist_ok=True)

# Niveaux de risque qui déclenchent une alerte (décision PFE du 26/06)
ALERTABLE_LEVELS = {"Modere", "Eleve", "Critique"}

# Mapping risk_level (risk_engine.py) -> severity (Alert.severity)
SEVERITY_MAP = {
    "Modere":   "Medium",
    "Eleve":    "High",
    "Critique": "Critical",
}


# ─────────────────────────────────────────────────────────────────
# Helpers métier
# ─────────────────────────────────────────────────────────────────
def _determine_alert(predicted_class: str, risk_level: str):
    """
    Décide si une alerte doit être créée et avec quel type/sévérité.
    Retourne (alert_type, severity) ou (None, None).
    """
    if risk_level not in ALERTABLE_LEVELS:
        return None, None

    # L'AFib prime sur tout le reste pour l'étiquetage clinique
    if predicted_class == "AFib":
        alert_type = "AFib_Detected"
    elif risk_level == "Critique":
        alert_type = "Critical_Risk"
    elif risk_level == "Eleve":
        alert_type = "High_Risk"
    else:  # Modere
        alert_type = "Moderate_Risk"

    return alert_type, SEVERITY_MAP[risk_level]


def _save_signal_to_disk(patient_id: int, signal: List[float]) -> str:
    """
    Écrit la fenêtre de 1000 points en CSV (un float par ligne).
    Convention : patient_{id}_realtime_{timestamp}.csv
    """
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"patient_{patient_id}_realtime_{ts}.csv"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "w") as f:
        for v in signal:
            f.write(f"{v}\n")
    return path


# ─────────────────────────────────────────────────────────────────
# Service MQTT
# ─────────────────────────────────────────────────────────────────
class MQTTService:
    def __init__(self):
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message

        # Buffer par patient : {patient_id: [floats...]}
        self.buffers: Dict[int, List[float]] = {}

        # Métadonnées les plus récentes par patient (spo2, tension, etc.)
        # Pour les inclure dans le CardioRisk Engine au moment de l'analyse.
        self.last_metadata: Dict[int, dict] = {}

        # Référence vers le manager WebSocket (rempli au start())
        self.websocket_manager = None
        self.loop = None

    # ── Callbacks MQTT ─────────────────────────────────────────
    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            print(f"[MQTT] Connecté au broker {MQTT_BROKER}:{MQTT_PORT}")
            client.subscribe(MQTT_TOPIC_ECG)
            print(f"[MQTT] Abonné au topic : {MQTT_TOPIC_ECG}")
        else:
            print(f"[MQTT] Échec connexion, code={reason_code}")

    def _on_message(self, client, userdata, msg):
        """
        Reçoit un message MQTT, accumule dans le buffer du patient,
        déclenche l'analyse dès que 1000 points sont disponibles.
        """
        try:
            # 1. Extraction du patient_id depuis le topic
            patient_id = int(msg.topic.split("/")[-1])

            # 2. Parsing du payload JSON
            data = json.loads(msg.payload.decode())
            signal_chunk = data.get("signal", [])
            if not isinstance(signal_chunk, list) or not signal_chunk:
                print(f"[MQTT] Message ignoré (signal absent ou vide) "
                      f"pour patient {patient_id}")
                return

            # 3. Stocke les métadonnées les plus récentes (spo2, tension...)
            self.last_metadata[patient_id] = {
                "spo2": data.get("spo2"),
                "tension_systolique": data.get("tension_systolique"),
                "temperature": data.get("temperature"),
                "source": data.get("source", "unknown"),
                "sample_rate": data.get("sample_rate", SAMPLE_RATE),
            }

            # 4. Forward live vers le frontend (visualisation temps réel)
            if self.websocket_manager and self.loop:
                asyncio.run_coroutine_threadsafe(
                    self.websocket_manager.send_ecg_data(patient_id, {
                        "type": "ecg_data",
                        "patient_id": patient_id,
                        "signal": signal_chunk,
                        "timestamp": data.get("timestamp"),
                        **{k: v for k, v in self.last_metadata[patient_id].items()
                           if v is not None},
                    }),
                    self.loop,
                )

            # 5. Ajout au buffer du patient
            buf = self.buffers.setdefault(patient_id, [])
            buf.extend(signal_chunk)

            # 6. Si fenêtre complète : analyser et vider exactement 1000 points
            while len(buf) >= WINDOW_SIZE:
                window = buf[:WINDOW_SIZE]
                del buf[:WINDOW_SIZE]   # fenêtre non chevauchante
                self._analyze_window(patient_id, window)

        except Exception as e:
            print(f"[MQTT] Erreur traitement message : {e}")

    # ── Pipeline d'analyse d'une fenêtre complète ──────────────
    def _analyze_window(self, patient_id: int, window: List[float]):
        """
        Pipeline complet pour UNE fenêtre de 1000 points :
        prédiction ECG -> score de risque -> persistance DB -> alerte -> log.
        Tout dans une session DB locale (on est dans le thread MQTT,
        pas dans une requête FastAPI).
        """
        db = SessionLocal()
        try:
            # 1. Récupère le patient (et son médecin)
            patient = db.query(Patient).filter(Patient.id == patient_id).first()
            if not patient:
                print(f"[MQTT] Patient {patient_id} introuvable, fenêtre ignorée")
                return

            # 2. Métadonnées IoT (avec valeurs par défaut si absentes)
            meta = self.last_metadata.get(patient_id, {})
            spo2 = meta.get("spo2") if meta.get("spo2") is not None else 98.0
            tension = (meta.get("tension_systolique")
                       if meta.get("tension_systolique") is not None else 120.0)
            source = meta.get("source", "mqtt_realtime")

            # 3. Inférence ECG (signal déjà à 100 Hz => source_hz=100)
            ecg_result = predict_ecg(window, source_hz=SAMPLE_RATE)

            # 4. Score CHADS-VASc enrichi IoT
            risk_data = calculate_chadsvasc(
                age=patient.age,
                gender=patient.gender,
                has_diabetes=patient.has_diabetes,
                has_hypertension=patient.has_hypertension,
                has_vascular_disease=patient.has_vascular_disease,
                previous_stroke=patient.previous_stroke,
                ecg_class=ecg_result["predicted_class"],
                ecg_probs=[
                    ecg_result["probabilities"]["Normal"],
                    ecg_result["probabilities"]["AFib"],
                    ecg_result["probabilities"]["PVC"],
                    ecg_result["probabilities"]["Other"],
                ],
                spo2=spo2,
                tension_systolique=tension,
            )

            # 5. Décide si une alerte doit être levée
            alert_type, severity = _determine_alert(
                ecg_result["predicted_class"], risk_data["risk_level"]
            )
            needs_alert = alert_type is not None

            # 6. Sauvegarde du signal sur disque UNIQUEMENT si alerte
            #    (stratégie de rétention sélective basée sur la pertinence clinique)
            file_path = ""
            if needs_alert:
                file_path = _save_signal_to_disk(patient_id, window)

            # 7. ECGRecord
            ecg_record = ECGRecord(
                patient_id=patient_id,
                doctor_id=patient.doctor_id,
                file_path=file_path,
                duration=float(WINDOW_SIZE / SAMPLE_RATE),  # 10.0 s
                source=source,
            )
            db.add(ecg_record)
            db.commit()
            db.refresh(ecg_record)

            # 8. Prediction (pas de LLM en temps réel — décision PFE)
            prediction = Prediction(
                ecg_record_id=ecg_record.id,
                predicted_class=ecg_result["predicted_class"],
                confidence=ecg_result["confidence"],
                probabilities=ecg_result["probabilities"],
                chadsvasc_score=risk_data["chadsvasc_score"],
                risk_level=risk_data["risk_level"],
                risk_immediate=risk_data["risk_immediate"],
                avc_risk_12m=risk_data["avc_risk_12m"],
                llm_report=None,
                attention_map={"data": ecg_result["attention_map"]},
            )
            db.add(prediction)
            db.commit()
            db.refresh(prediction)

            # 9. Alert si requis
            if needs_alert:
                alert = Alert(
                    prediction_id=prediction.id,
                    patient_id=patient_id,
                    doctor_id=patient.doctor_id,
                    alert_type=alert_type,
                    severity=severity,
                    message=(
                        f"[Temps réel] Patient {patient_id} — "
                        f"{ecg_result['predicted_class']} détecté "
                        f"(confiance {ecg_result['confidence']:.0%}). "
                        f"CHADS-VASc {risk_data['chadsvasc_score']}/9, "
                        f"risque {risk_data['risk_level']}."
                    ),
                    is_read=False,
                    email_sent=False,
                )
                db.add(alert)
                db.commit()

            # 10. Log système (le helper ne lève jamais d'exception)
            log_action(
                db=db,
                action="ECG_AUTO_ANALYSIS",
                user_email=None,            # pas d'utilisateur, c'est automatique
                user_role="system",
                details=(
                    f"Patient #{patient_id} → {ecg_result['predicted_class']} "
                    f"(conf {ecg_result['confidence']:.2f}, "
                    f"risque {risk_data['risk_level']}, "
                    f"alerte={'oui' if needs_alert else 'non'})"
                ),
            )

            print(
                f"[MQTT] Analyse patient {patient_id} → "
                f"{ecg_result['predicted_class']} "
                f"(conf {ecg_result['confidence']:.2f}, "
                f"risque {risk_data['risk_level']})"
                + (" ⚠️ ALERTE" if needs_alert else "")
            )

            # 11. Notification live au frontend du résultat d'analyse
            if self.websocket_manager and self.loop:
                asyncio.run_coroutine_threadsafe(
                    self.websocket_manager.send_ecg_data(patient_id, {
                        "type": "ecg_analysis",
                        "patient_id": patient_id,
                        "ecg_record_id": ecg_record.id,
                        "prediction_id": prediction.id,
                        "predicted_class": ecg_result["predicted_class"],
                        "confidence": ecg_result["confidence"],
                        "risk_level": risk_data["risk_level"],
                        "chadsvasc_score": risk_data["chadsvasc_score"],
                        "alert": needs_alert,
                    }),
                    self.loop,
                )

        except Exception as e:
            print(f"[MQTT] Erreur pipeline patient {patient_id} : {e}")
            db.rollback()
        finally:
            db.close()

    # ── Cycle de vie ───────────────────────────────────────────
    def start(self, websocket_manager, loop):
        self.websocket_manager = websocket_manager
        self.loop = loop
        try:
            self.client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.client.loop_start()
            print("[MQTT] Service démarré")
        except Exception as e:
            print(f"[MQTT] Broker indisponible : {e}")
            print("[MQTT] Le backend continue, mais le pipeline temps réel "
                  "ne fonctionnera pas tant que Mosquitto n'est pas relancé.")

    def stop(self):
        self.client.loop_stop()
        self.client.disconnect()
        print("[MQTT] Service arrêté")


# Singleton importé depuis main.py
mqtt_service = MQTTService()