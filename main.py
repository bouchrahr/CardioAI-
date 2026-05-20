from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from app.database.db import engine, Base
from app.models import user, patient, ecg_record, prediction, alert

# Importe le router d'authentification
from app.routes import auth, users, patients,ecg,history,notifications
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CardioAI API",
    description="Plateforme de monitoring cardiaque",
    version="1.0.0",
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

# Connecte le router auth à l'application
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(patients.router)
app.include_router(ecg.router)
app.include_router(history.router)
app.include_router(notifications.router)
@app.get("/")
def root():
    return {"message": "CardioAI API is running!"}