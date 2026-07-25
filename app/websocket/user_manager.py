# app/websocket/user_manager.py
#
# Gère les connexions WebSocket indexées par user_id (pas par patient_id).
# Utilisé par la route /api/ws pour :
#   - Notifications générales (nouveau patient, alertes cross-patient, admin)
#   - Monitoring dashboard global du médecin
#
# À NE PAS CONFONDRE avec app/websocket/manager.py qui indexe par patient_id
# et sert au streaming ECG temps réel (route /ws/ecg/{patient_id}).

from fastapi import WebSocket
from typing import Dict, List
import json


class UserConnectionManager:
    """
    Carnet d'adresses des connexions WebSocket ouvertes par utilisateur.

    Structure interne :
        {
            2: [ws_dashboard_ahmed_navigateur1, ws_dashboard_ahmed_mobile],
            3: [ws_dashboard_ali]
        }
    → Un même user peut avoir plusieurs connexions ouvertes (2 onglets, tel + laptop).
    """

    def __init__(self):
        # user_id → liste de WebSockets actifs pour cet utilisateur
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """
        Accepte une nouvelle connexion WebSocket pour un utilisateur.
        L'authentification (JWT) doit avoir été validée AVANT d'appeler cette méthode.
        """
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        print(f"✅ [UserWS] User {user_id} connecté "
              f"({len(self.active_connections[user_id])} session(s) active(s))")

    def disconnect(self, websocket: WebSocket, user_id: int):
        """Supprime une connexion (déconnexion propre ou erreur réseau)."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"❌ [UserWS] User {user_id} déconnecté")

    async def send_to_user(self, user_id: int, channel: str, data: dict):
        """
        Envoie un message à TOUTES les sessions actives d'un utilisateur.

        Format standardisé : {"channel": "...", "type": "...", "data": {...}}

        Args:
            user_id : à qui envoyer
            channel : "notifications" | "monitoring" | ... (typage libre)
            data    : payload arbitraire (contiendra un "type" pour discriminer)

        Silencieux si l'utilisateur n'est pas connecté (normal, il est ailleurs).
        """
        if user_id not in self.active_connections:
            return

        message = json.dumps({
            "channel": channel,
            "data": data
        })

        disconnected = []
        for ws in self.active_connections[user_id]:
            try:
                await ws.send_text(message)
            except Exception as e:
                print(f"⚠️ [UserWS] Erreur envoi user {user_id}: {e}")
                disconnected.append(ws)

        # Nettoyer les connexions mortes
        for ws in disconnected:
            self.disconnect(ws, user_id)

    async def broadcast_to_role(self, user_ids: List[int], channel: str, data: dict):
        """
        Envoie un message à plusieurs utilisateurs (ex : tous les admins).
        La liste des user_ids doit être calculée par l'appelant (ex : requête DB).
        """
        for user_id in user_ids:
            await self.send_to_user(user_id, channel, data)

    def is_user_connected(self, user_id: int) -> bool:
        """Utile pour décider si on envoie une notif WS ou un email fallback."""
        return user_id in self.active_connections and \
               len(self.active_connections[user_id]) > 0


# Instance globale — singleton
user_manager = UserConnectionManager()