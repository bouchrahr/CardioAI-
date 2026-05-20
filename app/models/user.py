# Ce fichier décrit la table "users" dans PostgreSQL
# Chaque classe = une table, chaque attribut = une colonne

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database.db import Base

class User(Base):
    __tablename__ = "users"  # nom de la table dans PostgreSQL

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role       = Column(String(20), nullable=False)  # 'admin', 'doctor', 'patient'
    first_name = Column(String(100))
    last_name  = Column(String(100))
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    