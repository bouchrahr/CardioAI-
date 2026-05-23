import paho.mqtt.client as mqtt
import json
import asyncio
import numpy as np
from datetime import datetime

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC_ECG = "cardioai/ecg/+"

def generate_mock_ecg(patient_id: int) -> dict:
    """Génère un signal ECG simulé quand MySignals n'est pas disponible."""
    t = np.linspace(0, 1, 100)
    ecg = (
        0.1 * np.sin(2 * np.pi * 1.2 * t) +
        0.8 * np.exp(-((t - 0.3) ** 2) / 0.001) +
        -0.2 * np.exp(-((t - 0.32) ** 2) / 0.0005) +
        0.15 * np.sin(2 * np.pi * 0.8 * (t - 0.4))
    )
    ecg += np.random.normal(0, 0.02, 100)
    return {
        "type": "ecg_data",
        "patient_id": patient_id,
        "timestamp": datetime.utcnow().isoformat(),
        "signal": ecg.tolist(),
        "sample_rate": 100,
        "source": "mock"
    }

class MQTTService:
    def __init__(self):
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.websocket_manager = None
        self.loop = None

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        print(f"✅ MQTT connecté au broker (code: {reason_code})")
        client.subscribe(MQTT_TOPIC_ECG)
        print(f"📡 Abonné au topic : {MQTT_TOPIC_ECG}")

    def _on_message(self, client, userdata, msg):
        """Reçoit un message MQTT et le transmet via WebSocket"""
        try:
            topic_parts = msg.topic.split("/")
            patient_id = int(topic_parts[-1])

            data = json.loads(msg.payload.decode())
            data["patient_id"] = patient_id
            data["type"] = "ecg_data"

            print(f"📨 MQTT reçu : {msg.topic} | SpO2: {data.get('spo2')}% | Temp: {data.get('temperature')}°C")

            if self.websocket_manager and self.loop:
                asyncio.run_coroutine_threadsafe(
                    self.websocket_manager.send_ecg_data(patient_id, data),
                    self.loop
                )
        except Exception as e:
            print(f"❌ Erreur traitement message MQTT: {e}")

    def start(self, websocket_manager, loop):
        """Démarre la connexion MQTT"""
        self.websocket_manager = websocket_manager
        self.loop = loop
        try:
            self.client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.client.loop_start()
            print("🚀 Service MQTT démarré")
        except Exception as e:
            print(f"⚠️ MQTT non disponible: {e} — mode simulation activé")

    def stop(self):
        """Arrête la connexion MQTT"""
        self.client.loop_stop()
        self.client.disconnect()

mqtt_service = MQTTService()