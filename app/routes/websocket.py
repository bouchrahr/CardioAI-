from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import manager
import asyncio
import json
import numpy as np
from datetime import datetime

router = APIRouter()

def generate_ecg_point(patient_id: int) -> dict:
    """Génère 1 seconde de signal ECG simulé (100 points)"""
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
        "source": "simulation"
    }

@router.websocket("/ws/ecg/{patient_id}")
async def websocket_ecg(websocket: WebSocket, patient_id: int):
    await manager.connect(websocket, patient_id)
    try:
        # Message de confirmation
        await websocket.send_text(json.dumps({
            "type": "connected",
            "patient_id": patient_id,
            "message": f"Connexion etablie pour patient {patient_id}"
        }))

        # Boucle : envoyer ECG toutes les secondes
        while True:
            data = generate_ecg_point(patient_id)
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(1)

    except WebSocketDisconnect:
        manager.disconnect(websocket, patient_id)
    except Exception as e:
        print(f"Erreur WebSocket: {e}")
        manager.disconnect(websocket, patient_id)