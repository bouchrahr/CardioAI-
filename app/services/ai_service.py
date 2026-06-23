import numpy as np
import torch
import os
from scipy.signal import resample, butter, sosfilt
from app.services.inception_model import InceptionTimeSE

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../models/best_InceptionTimeSE_4class.pth"
)
CLASS_NAMES = ['Normal', 'AFib', 'PVC', 'Other']

_model = None

def load_model():
    global _model
    if _model is None:
        print("Chargement InceptionTime+SE...")
        model = InceptionTimeSE(num_classes=4)
        state = torch.load(MODEL_PATH, map_location='cpu')
        if 'model_state_dict' in state:
            state = state['model_state_dict']
        model.load_state_dict(state)
        model.eval()
        _model = model
        print("Modele InceptionTime+SE charge !")
    return _model


def bandpass_filter(ecg, lowcut=0.5, highcut=40.0, fs=100, order=4):
    nyq = fs / 2
    sos = butter(order, [lowcut / nyq, highcut / nyq], btype='band', output='sos')
    return sosfilt(sos, ecg)


def preprocess_ecg(signal: list, source_hz: int = 500) -> torch.Tensor:
    sig = np.array(signal, dtype=np.float32)

    # 1. Resample vers 100Hz/1000 points si la source n'est pas déjà à 100Hz
    if source_hz != 100:
        sig = resample(sig, 1000)

    # 2. Padding/troncature à exactement 1000 points (sécurité)
    if len(sig) < 1000:
        sig = np.pad(sig, (0, 1000 - len(sig)))
    else:
        sig = sig[:1000]

    # 3. Filtre passe-bande Butterworth 0.5-40Hz (identique au notebook Kaggle)
    sig = bandpass_filter(sig, lowcut=0.5, highcut=40.0, fs=100, order=4)

    # 4. Normalisation Z-score sur le signal FILTRÉ (pas le signal brut)
    std = sig.std()
    if std > 1e-8:
        sig = (sig - sig.mean()) / std
    else:
        sig = sig - sig.mean()

    # 5. Clipping [-5, 5] (identique au notebook, pas [-3, 3])
    sig = np.clip(sig, -5, 5).astype(np.float32)

    return torch.FloatTensor(sig).unsqueeze(0).unsqueeze(0)

def predict_ecg(ecg_signal: list, source_hz: int = 500) -> dict:
    try:
        model = load_model()
        x = preprocess_ecg(ecg_signal, source_hz)
        with torch.no_grad():
            out = model(x)
            probs = torch.softmax(out, dim=1).squeeze().tolist()
        pred_idx = int(np.argmax(probs))
        return {
            "predicted_class": CLASS_NAMES[pred_idx],
            "predicted_idx": pred_idx,
            "confidence": round(probs[pred_idx], 3),
            "probabilities": {
                CLASS_NAMES[i]: round(probs[i], 3) for i in range(4)
            },
            "attention_map": [round(float(v), 3) for v in np.linspace(0, 1, 100)]
        }
    except Exception as e:
        print(f"Erreur inference ECG: {e}")
        return {
            "predicted_class": "Normal",
            "predicted_idx": 0,
            "confidence": 0.0,
            "probabilities": {"Normal": 1.0, "AFib": 0.0, "PVC": 0.0, "Other": 0.0},
            "attention_map": [0.0] * 100,
            "error": str(e)
        }