"""
passerelle_ecg.py
─────────────────
Passerelle MySignals → MQTT pour CardioAI.

Deux modes (exclusifs) :
  --simulate (défaut) : streame des signaux réels PTB-XL depuis test_data/
  --serial COMx       : lit le port série Arduino, accumule 1000 points, publie

Exemples :
    # Stream continu (1 fenêtre/10s) d'AFib pour patient 6 — démo jury
    python passerelle_ecg.py --class afib --patient-id 6

    # Une seule fenêtre Normal pour tester rapidement
    python passerelle_ecg.py --once --class normal

    # 5 fenêtres aléatoires de classes variées
    python passerelle_ecg.py --count 5 --class random

    # Avec capteurs SpO2/tension simulés (modificateurs CardioRisk)
    python passerelle_ecg.py --class normal --spo2 88 --tension 190

    # Mode série Arduino (PAS ENCORE TESTÉ — voir doc Arduino)
    python passerelle_ecg.py --serial COM5 --patient-id 6
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import paho.mqtt.client as mqtt

# ─────────────────────────────────────────────────────────────────
WINDOW_SIZE = 1000          # 10 s à 100 Hz
SAMPLE_RATE = 100           # Hz, aligné PTB-XL et InceptionTime+SE
DEFAULT_BROKER = "localhost"
DEFAULT_PORT = 1883
DEFAULT_PATIENT_ID = 6
DEFAULT_INTERVAL_S = 10
DEFAULT_TEST_DATA = "test_data"

CLASS_NAMES = ["Normal", "AFib", "PVC", "Other"]
CLASS_TO_IDX = {"normal": 0, "afib": 1, "pvc": 2, "other": 3}


# ─────────────────────────────────────────────────────────────────
# Source PTB-XL (mode --simulate)
# ─────────────────────────────────────────────────────────────────
class PTBXLSource:
    """Pioche des fenêtres de 1000 points dans X_test.npy / y_test.npy."""

    def __init__(self, test_data_dir: str):
        x_path = Path(test_data_dir) / "X_test.npy"
        y_path = Path(test_data_dir) / "y_test.npy"
        if not x_path.exists() or not y_path.exists():
            raise FileNotFoundError(
                f"Fichiers PTB-XL introuvables dans {test_data_dir}/.\n"
                f"Attendu : X_test.npy (existe={x_path.exists()}) "
                f"et y_test.npy (existe={y_path.exists()}).\n"
                f"Re-générer depuis le notebook Kaggle (split test, "
                f"random_state=42, test_size=0.15)."
            )
        self.X = np.load(x_path)
        self.y = np.load(y_path)

        # Si dimension extra (N, 1000, 1), on la retire
        if self.X.ndim == 3:
            self.X = self.X.squeeze(-1)

        unique_classes = sorted(set(self.y.tolist()))
        counts = {CLASS_NAMES[c]: int((self.y == c).sum()) for c in unique_classes}
        print(f"[Source PTB-XL] {len(self.X)} signaux chargés depuis {x_path}")
        print(f"[Source PTB-XL] Distribution des classes : {counts}")

    def pick(self, class_filter: str):
        """Retourne (signal_1000_pts, classe_idx, classe_name)."""
        if class_filter == "random":
            idx = int(np.random.randint(0, len(self.X)))
        else:
            target = CLASS_TO_IDX[class_filter]
            candidates = np.where(self.y == target)[0]
            if len(candidates) == 0:
                raise RuntimeError(
                    f"Aucun signal de classe '{class_filter}' (idx {target}) "
                    f"dans ce test set."
                )
            idx = int(np.random.choice(candidates))

        signal = self.X[idx].astype(np.float64).tolist()
        actual_class = int(self.y[idx])
        return signal, actual_class, CLASS_NAMES[actual_class]


# ─────────────────────────────────────────────────────────────────
# Source série (mode --serial) — non testé sans matériel
# ─────────────────────────────────────────────────────────────────
class SerialSource:
    """
    Lit ligne par ligne depuis le port série (Arduino Uno + MySignals HW),
    accumule 1000 points, retourne la fenêtre.
    
    NOTE : non testé sans matériel. Format attendu : un float par ligne
    (output de Serial.println(MySignals.getECG(VOLTAGE), 4)).
    """

    def __init__(self, port: str, baud: int):
        try:
            import serial
        except ImportError:
            print("✗ Module 'pyserial' manquant. Installation :")
            print("    pip install pyserial")
            sys.exit(1)

        try:
            self.ser = serial.Serial(port, baud, timeout=1)
        except Exception as e:
            print(f"✗ Impossible d'ouvrir {port} @ {baud} : {e}")
            sys.exit(1)

        print(f"[Source série] {port} @ {baud} bauds — en attente de données…")

    def collect_window(self) -> list:
        """Bloque jusqu'à WINDOW_SIZE points float valides."""
        buf = []
        skipped = 0
        while len(buf) < WINDOW_SIZE:
            line = self.ser.readline().decode(errors="ignore").strip()
            if not line:
                continue
            try:
                buf.append(float(line))
            except ValueError:
                skipped += 1
                continue
        if skipped:
            print(f"[Source série] {skipped} ligne(s) corrompue(s) ignorée(s) "
                  f"sur cette fenêtre")
        return buf


# ─────────────────────────────────────────────────────────────────
# Publication MQTT
# ─────────────────────────────────────────────────────────────────
def publish_window(client, patient_id, signal, source_label, extra=None):
    payload = {
        "patient_id": patient_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "signal": signal,
        "sample_rate": SAMPLE_RATE,
        "source": source_label,
    }
    if extra:
        payload.update(extra)

    topic = f"cardioai/ecg/{patient_id}"
    info = client.publish(topic, json.dumps(payload), qos=0)
    info.wait_for_publish(timeout=5.0)
    return topic


# ─────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Passerelle MySignals → MQTT pour CardioAI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--simulate", action="store_true",
                      help="Streame depuis test_data/X_test.npy (mode par défaut)")
    mode.add_argument("--serial", type=str, metavar="PORT",
                      help="Lit depuis le port série, ex: --serial COM5")

    parser.add_argument("--patient-id", type=int, default=DEFAULT_PATIENT_ID,
                        help=f"ID du patient cible (défaut {DEFAULT_PATIENT_ID})")
    parser.add_argument("--broker", type=str, default=DEFAULT_BROKER,
                        help=f"Adresse broker MQTT (défaut {DEFAULT_BROKER})")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT,
                        help=f"Port MQTT (défaut {DEFAULT_PORT})")
    parser.add_argument("--interval", type=float, default=DEFAULT_INTERVAL_S,
                        help=f"Secondes entre fenêtres en stream continu "
                             f"(défaut {DEFAULT_INTERVAL_S})")
    parser.add_argument("--count", type=int, default=0,
                        help="Nombre de fenêtres à publier (0 = infini, défaut 0)")
    parser.add_argument("--once", action="store_true",
                        help="Alias pour --count 1 (publie une seule fenêtre)")

    parser.add_argument("--class", dest="class_filter", type=str, default="random",
                        choices=["random", "normal", "afib", "pvc", "other"],
                        help="Classe à piocher dans le test set (défaut random)")
    parser.add_argument("--test-data", type=str, default=DEFAULT_TEST_DATA,
                        help=f"Dossier X_test.npy/y_test.npy "
                             f"(défaut {DEFAULT_TEST_DATA})")

    parser.add_argument("--baud", type=int, default=115200,
                        help="Baud rate série (défaut 115200)")

    parser.add_argument("--spo2", type=float, default=None,
                        help="SpO2 (%%) à inclure dans le payload (optionnel)")
    parser.add_argument("--tension", type=float, default=None,
                        help="Tension systolique (mmHg) à inclure (optionnel)")

    args = parser.parse_args()

    if args.once:
        args.count = 1

    # ── Init source ──
    if args.serial:
        source = SerialSource(args.serial, args.baud)
        source_label = f"mysignals_serial:{args.serial}"
        source_type = "serial"
    else:
        try:
            source = PTBXLSource(args.test_data)
        except FileNotFoundError as e:
            print(f"✗ {e}")
            sys.exit(1)
        source_label = "ptbxl_replay"
        source_type = "simulate"

    # ── Connexion MQTT ──
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    try:
        client.connect(args.broker, args.port, 60)
    except Exception as e:
        print(f"✗ Connexion MQTT impossible vers {args.broker}:{args.port} : {e}")
        print(f"  Vérifie Mosquitto : netstat -ano | findstr :{args.port}")
        sys.exit(1)
    client.loop_start()

    print(f"\n[Passerelle] Mode={source_type} | broker={args.broker}:{args.port} | "
          f"patient_id={args.patient_id}")
    print(f"[Passerelle] Topic : cardioai/ecg/{args.patient_id}")
    if args.count == 0:
        print(f"[Passerelle] Stream continu, 1 fenêtre toutes les {args.interval}s "
              f"(Ctrl+C pour arrêter)")
    else:
        print(f"[Passerelle] {args.count} fenêtre(s) puis stop")
    print()

    extra_meta = {}
    if args.spo2 is not None:
        extra_meta["spo2"] = args.spo2
    if args.tension is not None:
        extra_meta["tension_systolique"] = args.tension

    # ── Boucle d'envoi ──
    published = 0
    try:
        while args.count == 0 or published < args.count:
            if source_type == "serial":
                signal = source.collect_window()
                label_info = ""
            else:
                signal, actual_idx, actual_name = source.pick(args.class_filter)
                label_info = f" (vraie classe PTB-XL : {actual_name})"

            topic = publish_window(client, args.patient_id, signal,
                                   source_label, extra_meta)
            published += 1
            ts = datetime.now().strftime("%H:%M:%S")
            print(f"[{ts}] ✓ Fenêtre #{published} publiée sur {topic}{label_info}")

            if args.count == 0 or published < args.count:
                if source_type == "simulate":
                    time.sleep(args.interval)
                # En mode série, collect_window() bloque déjà ~10s à 100Hz.

    except KeyboardInterrupt:
        print("\n[Passerelle] Interrompu par l'utilisateur (Ctrl+C)")
    finally:
        client.loop_stop()
        client.disconnect()
        print(f"[Passerelle] Terminé. {published} fenêtre(s) publiée(s) au total.")


if __name__ == "__main__":
    main()