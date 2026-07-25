# test_ws_user.py — client de test propre avec lib `websockets`
import asyncio
import json
import sys
import websockets


async def test_connection(token: str):
    url = f"ws://localhost:8000/api/ws?token={token}"
    print(f"🔌 Connexion...")

    async with websockets.connect(url) as ws:
        print("✅ WebSocket ouvert !\n")

        # 1. Recevoir le message de bienvenue
        welcome = await ws.recv()
        print(f"⬅️  Bienvenue : {welcome}\n")

        # 2. Envoyer un ping
        await ws.send(json.dumps({"action": "ping"}))
        print("➡️  Ping envoyé")

        # 3. Recevoir le pong
        pong = await ws.recv()
        print(f"⬅️  Pong reçu : {pong}\n")

        # 4. Garder la connexion ouverte 10s pour observer
        print("⏳ Connexion maintenue 10s (Ctrl+C pour quitter)...")
        await asyncio.sleep(10)
        print("✅ Test terminé avec succès !")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage : python test_ws_user.py <TOKEN>")
        sys.exit(1)
    asyncio.run(test_connection(sys.argv[1]))