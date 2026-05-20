# Ce fichier crée la connexion entre FastAPI et PostgreSQL

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv
import os

# Charge les variables du fichier .env
load_dotenv()

# Récupère l'URL de la base de données depuis .env
DATABASE_URL = os.getenv("DATABASE_URL")

# Crée le moteur de connexion à PostgreSQL
# C'est lui qui fait vraiment la connexion
engine = create_engine(DATABASE_URL)

# SessionLocal : on l'utilise pour faire des requêtes à la base
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base : toutes nos tables vont hériter de cette classe
class Base(DeclarativeBase):
    pass

# Fonction utilitaire : donne une session et la ferme après
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()