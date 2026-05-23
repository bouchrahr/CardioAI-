from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    """
    Gère toutes les connexions WebSocket actives.
    
    Imagine un tableau de bord avec plusieurs médecins connectés.
    Chaque médecin surveille ses patients en temps réel.
    Ce manager sait qui est connecté et envoie les données au bon médecin.
    """

    def __init__(self):
        # Dictionnaire : patient_id → liste de connexions WebSocket
        # Ex: {6: [ws_medecin1, ws_medecin2], 7: [ws_medecin1]}
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, patient_id: int):
        """Accepte une nouvelle connexion WebSocket pour un patient"""
        await websocket.accept()
        if patient_id not in self.active_connections:
            self.active_connections[patient_id] = []
        self.active_connections[patient_id].append(websocket)
        print(f"✅ WebSocket connecté pour patient {patient_id}")

    def disconnect(self, websocket: WebSocket, patient_id: int):
        """Supprime une connexion WebSocket quand le médecin ferme la page"""
        if patient_id in self.active_connections:
            self.active_connections[patient_id].remove(websocket)
            if not self.active_connections[patient_id]:
                del self.active_connections[patient_id]
        print(f"❌ WebSocket déconnecté pour patient {patient_id}")

    async def send_ecg_data(self, patient_id: int, data: dict):
        """
        Envoie des données ECG à tous ceux qui surveillent ce patient.
        Si personne ne surveille ce patient, on ignore.
        """
        if patient_id not in self.active_connections:
            return
        
        message = json.dumps(data)
        # Envoyer à toutes les connexions actives pour ce patient
        disconnected = []
        for websocket in self.active_connections[patient_id]:
            try:
                await websocket.send_text(message)
            except Exception:
                # Si erreur, marquer comme déconnecté
                disconnected.append(websocket)
        
        # Nettoyer les connexions mortes
        for ws in disconnected:
            self.disconnect(ws, patient_id)

    async def broadcast_alert(self, patient_id: int, alert: dict):
        """Envoie une alerte urgente pour un patient"""
        await self.send_ecg_data(patient_id, {
            "type": "alert",
            "patient_id": patient_id,
            **alert
        })

# Instance globale — un seul manager pour toute l'application
manager = ConnectionManager()