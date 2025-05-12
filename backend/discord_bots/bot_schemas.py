from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DiscordBotBase(BaseModel):
    name: str
    token: str
    model_id: Optional[int] = None

class DiscordBotCreate(DiscordBotBase):
    pass

class DiscordBotUpdate(BaseModel):
    name: Optional[str] = None
    token: Optional[str] = None
    model_id: Optional[int] = None
    is_active: Optional[bool] = None

class DiscordBot(DiscordBotBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True