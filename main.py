from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import asyncio

load_dotenv()

from app.database.db import engine, Base
from app.models import user, patient, ecg_record, prediction, alert, token_blacklist
from app.models import log, mri_scan, digital_twin, treatment_simulation, medical_note
from app.routes import auth, users, patients, ecg, history, notifications
from app.routes import digital_twin as digital_twin_router
from app.routes import websocket
from app.routes import ws_user                          # ← NOUVEAU
from app.websocket.manager import manager
from app.services.mqtt_service import mqtt_service
from app.services.mri_service import mri_service
from app.routes import logs as logs_router

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Démarrage ──────────────────────────────────────────────
    # 1. Pipeline temps réel MQTT
    loop = asyncio.get_event_loop()
    mqtt_service.start(manager, loop)

    # 2. Modèle nnU-Net IRM (chargé une seule fois, dans un thread pour
    #    ne pas bloquer le démarrage du serveur — le chargement CPU prend qq secondes)
    await asyncio.to_thread(mri_service.load_model)

    yield

    # ── Arrêt ──────────────────────────────────────────────────
    mqtt_service.stop()


app = FastAPI(
    title="CardioAI API",
    description="Plateforme de monitoring cardiaque",
    version="1.0.0",
    lifespan=lifespan
)

origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(patients.router)
app.include_router(ecg.router)
app.include_router(history.router)
app.include_router(notifications.router)
app.include_router(digital_twin_router.router)
app.include_router(websocket.router)
app.include_router(ws_user.router)                      # ← NOUVEAU
app.include_router(logs_router.router)


@app.get("/")
def root():
    return {"message": "CardioAI API is running!"}