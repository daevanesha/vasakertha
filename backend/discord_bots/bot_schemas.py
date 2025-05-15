from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict

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

class DiscordBot(BaseModel):
    id: int
    name: str
    token: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    guilds: List[Dict[str, str]] = []  # List of guilds the bot is connected to

    class Config:
        from_attributes = True