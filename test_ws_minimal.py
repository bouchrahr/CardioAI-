# test_ws_minimal.py
# Test avec websocket-client (lib différente, plus verbose)

import sys
import json
import websocket

def on_open(ws):
    print("✅ Connexion ouverte !")
    ws.send(json.dumps({"action": "ping"}))
    print("➡️  Envoyé : ping")

def on_message(ws, message):
    print(f"⬅️  Reçu   : {message}")

def on_error(ws, error):
    print(f"❌ Erreur : {type(error).__name__} : {error}")

def on_close(ws, close_status_code, close_msg):
    print(f"🔌 Fermé : status={close_status_code}, msg={close_msg}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage : python test_ws_minimal.py <TOKEN>")
        sys.exit(1)

    token = sys.argv[1]
    url = f"ws://localhost:8000/api/ws?token={token}"

    # Active le mode verbose pour voir les headers HTTP échangés
    websocket.enableTrace(True)

    ws = websocket.WebSocketApp(
        url,
        header={"Origin": "http://localhost:5173"},
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )
    ws.run_forever()