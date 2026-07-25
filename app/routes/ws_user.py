# app/routes/ws_user.py
#
# Route WebSocket authentifiée : /api/ws?token=xxx
#
# Le JWT passe en query param car les WebSockets navigateur ne supportent pas
# les headers custom (pas de "Authorization: Bearer"). En prod : wss:// + tokens courts.
#
# Format des messages sortants (serveur → client) :
#     { "channel": "notifications" | "monitoring" | "system", "data": {...} }

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from app.database.db import SessionLocal
from app.core.security import decode_token
from app.models.user import User
from app.models.token_blacklist import TokenBlacklist
from app.websocket.user_manager import user_manager

router = APIRouter(prefix="/api", tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT d'authentification"),
):
    """
    WebSocket authentifié pour un utilisateur connecté (notifications + monitoring global).

    Flow d'authentification :
      1. Décoder le JWT → extraire user_id depuis le champ "sub"
      2. Vérifier que le token n'est pas blacklisté (logout précédent)
      3. Vérifier que le user existe et est actif
      4. Accepter la connexion et l'enregistrer dans user_manager
      5. Boucle d'écoute (ping/pong + actions futures)
    """
    db: Session = SessionLocal()
    user_id = None

    try:
        # ── 1. Décodage JWT ───────────────────────────────────
        payload = decode_token(token)
        if payload is None:
            await websocket.close(code=1008, reason="Invalid or expired token")
            return

        # user_id est stocké dans "sub" (string) — cf. auth.py create_access_token
        sub = payload.get("sub")
        if sub is None:
            await websocket.close(code=1008, reason="Malformed token payload")
            return

        try:
            user_id = int(sub)
        except (TypeError, ValueError):
            await websocket.close(code=1008, reason="Invalid user id in token")
            return

        # ── 2. Vérifier blacklist ─────────────────────────────
        blacklisted = db.query(TokenBlacklist).filter(
            TokenBlacklist.token == token
        ).first()
        if blacklisted:
            await websocket.close(code=1008, reason="Token revoked")
            return

        # ── 3. Vérifier user existe & actif ───────────────────
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            await websocket.close(code=1008, reason="User inactive")
            return

        # ── 4. Accepter & enregistrer ─────────────────────────
        await user_manager.connect(websocket, user_id)

        # Message de bienvenue (utile pour confirmer la connexion côté frontend)
        await user_manager.send_to_user(user_id, "system", {
            "type": "connected",
            "user_id": user_id,
            "role": user.role,
        })

        # ── 5. Boucle d'écoute des messages client ────────────
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                action = msg.get("action")

                if action == "ping":
                    await websocket.send_text(json.dumps({
                        "channel": "system",
                        "data": {"type": "pong"}
                    }))
                # Actions futures à ajouter ici :
                # elif action == "subscribe_patient": ...
                # elif action == "acknowledge_alert": ...
            except json.JSONDecodeError:
                pass  # texte non-JSON → ignoré

    except WebSocketDisconnect:
        pass  # déconnexion normale (client a fermé la page)
    except Exception as e:
        print(f"⚠️ [WS /api/ws] Erreur user_id={user_id}: {e}")
    finally:
        if user_id is not None:
            user_manager.disconnect(websocket, user_id)
        db.close()