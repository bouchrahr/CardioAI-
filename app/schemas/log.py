from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class LogResponse(BaseModel):
    id: int
    action: str
    user: Optional[str] = None        # mappé depuis user_email
    role: Optional[str] = None        # mappé depuis user_role
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True