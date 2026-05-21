# Table pour stocker les tokens révoqués après logout

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database.db import Base

class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"

    id         = Column(Integer, primary_key=True, index=True)
    token      = Column(String, unique=True, nullable=False, index=True)
    revoked_at = Column(DateTime, server_default=func.now())