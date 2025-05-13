from __future__ import annotations
from pydantic import BaseModel, validator, field_validator
from datetime import datetime
from typing import Optional, List, Any
import re

# Base Config for all models
class BaseModelWithConfig(BaseModel):
    class Config:
        from_attributes = True  # new name for orm_mode in pydantic v2

# AI Provider Schemas
class AIProviderBase(BaseModelWithConfig):
    name: str
    api_key: str
    is_active: bool = True

class AIProviderCreate(AIProviderBase):
    pass

class AIProvider(AIProviderBase):
    id: int
    created_at: datetime
    updated_at: datetime

# AI Model Schemas
class AIModelBase(BaseModel):
    name: str
    provider_id: int
    model_id: str
    configuration: str
    is_active: bool = True
    short_description: Optional[str] = ""
    tags: Optional[List[str]] = []
    active: Optional[bool] = True
    image_url: Optional[str] = ""  # New: model image URL

    @field_validator('tags', mode='before')
    @classmethod
    def parse_tags(cls, v: Any):
        if v is None or v == '' or v == []:
            return []
        if isinstance(v, str):
            import json
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
                if isinstance(parsed, dict):
                    # If dict, return keys if all values are True/False/None/empty, else values
                    if all(val in (True, False, None, "") for val in parsed.values()):
                        return list(parsed.keys())
                    return list(parsed.values())
                return []
            except Exception:
                return []
        if isinstance(v, dict):
            if not v:
                return []
            if all(val in (True, False, None, "") for val in v.values()):
                return list(v.keys())
            return list(v.values())
        if isinstance(v, list):
            return v
        # Defensive fallback: wrap as list
        return [str(v)]

class AIModelCreate(AIModelBase):
    pass

class AIModelUpdate(AIModelBase):
    name: Optional[str] = None
    provider_id: Optional[int] = None
    model_id: Optional[str] = None
    configuration: Optional[str] = None
    is_active: Optional[bool] = None
    short_description: Optional[str] = None
    tags: Optional[List[str]] = None
    active: Optional[bool] = None
    image_url: Optional[str] = None  # New: model image URL

class AIModel(AIModelBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Bot Model Integration Schemas
class BotModelIntegrationBase(BaseModelWithConfig):
    bot_id: int
    model_id: int
    command: str
    # Optionally, you can add config: dict = {} if you use it
    # config: Optional[dict] = None

class BotModelIntegrationCreate(BotModelIntegrationBase):
    pass

class BotModelIntegrationUpdate(BaseModelWithConfig):
    model_id: Optional[int] = None
    command: Optional[str] = None
    # config: Optional[dict] = None

class BotModelIntegration(BotModelIntegrationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
