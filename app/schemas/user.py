from pydantic import BaseModel, EmailStr
from typing import Optional

from typing import Optional

class LoginRequest(BaseModel):
    """Ce que le frontend envoie pour se connecter"""
    email: EmailStr
    password: str

class CreateUserRequest(BaseModel):
    """Ce que l'admin envoie pour créer un compte"""
    email: EmailStr
    password: str
    role: str          # 'doctor' ou 'patient'
    first_name: str
    last_name: str

class UserResponse(BaseModel):
    """Ce que le backend renvoie après création"""
    id: int
    email: str
    role: str
    first_name: str
    last_name: str
    is_active: bool

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    """Ce que le backend renvoie après connexion"""
    access_token: str
    token_type: str
    role: str
    user: dict       



class UpdateUserRequest(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None