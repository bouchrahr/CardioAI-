import asyncio
import websockets
import json

async def test():
    uri = "ws://localhost:8000/ws/ecg/6"
    async with websockets.connect(uri) as ws:
        print("Connecte!")
        for i in range(3):
            msg = await ws.recv()
            data = json.loads(msg)
            signal_len = len(data.get("signal", []))
            print(f"Message {i+1}: type={data['type']}, points ECG={signal_len}")

asyncio.run(test())