"""
Simulateur MySignals — publie des données ECG sur MQTT
Lance ce script dans un terminal séparé pour simuler le matériel IoT
"""
import paho.mqtt.client as mqtt
import numpy as np
import json
import time
from datetime import datetime

BROKER = "localhost"
PORT = 1883
PATIENT_ID = 6  # Change selon le patient à surveiller

def generate_ecg():
    t = np.linspace(0, 1, 100)
    ecg = (
        0.1 * np.sin(2 * np.pi * 1.2 * t) +
        0.8 * np.exp(-((t - 0.3) ** 2) / 0.001) +
        -0.2 * np.exp(-((t - 0.32) ** 2) / 0.0005) +
        0.15 * np.sin(2 * np.pi * 0.8 * (t - 0.4))
    )
    ecg += np.random.normal(0, 0.02, 100)
    return ecg.tolist()

def generate_vitals():
    """Simule aussi SpO2, température, tension"""
    return {
        "spo2": round(np.random.uniform(95, 100), 1),
        "temperature": round(np.random.uniform(36.5, 37.5), 1),
        "systolic_bp": int(np.random.uniform(110, 140)),
        "diastolic_bp": int(np.random.uniform(70, 90)),
    }

# Connexion au broker
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.connect(BROKER, PORT, 60)
client.loop_start()

print(f"🏥 Simulateur MySignals démarré")
print(f"📡 Publication sur : cardioai/ecg/{PATIENT_ID}")
print(f"⏱️  Fréquence : 1 message/seconde")
print(f"🛑 CTRL+C pour arrêter\n")

try:
    while True:
        vitals = generate_vitals()
        payload = {
            "patient_id": PATIENT_ID,
            "timestamp": datetime.utcnow().isoformat(),
            "ecg_signal": generate_ecg(),
            "sample_rate": 100,
            "spo2": vitals["spo2"],
            "temperature": vitals["temperature"],
            "systolic_bp": vitals["systolic_bp"],
            "diastolic_bp": vitals["diastolic_bp"],
            "source": "mysignals_simulation"
        }

        topic = f"cardioai/ecg/{PATIENT_ID}"
        client.publish(topic, json.dumps(payload))
        
        print(f"📤 Publié → SpO2: {vitals['spo2']}% | "
              f"Temp: {vitals['temperature']}°C | "
              f"BP: {vitals['systolic_bp']}/{vitals['diastolic_bp']} mmHg")
        
        time.sleep(1)

except KeyboardInterrupt:
    print("\n🛑 Simulateur arrêté")
    client.loop_stop()
    client.disconnect()