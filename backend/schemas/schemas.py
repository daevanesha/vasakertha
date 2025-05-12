from __future__ import annotations
from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional, List
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

class AIModelCreate(AIModelBase):
    pass

class AIModelUpdate(AIModelBase):
    name: Optional[str] = None
    provider_id: Optional[int] = None
    model_id: Optional[str] = None
    configuration: Optional[str] = None
    is_active: Optional[bool] = None

class AIModel(AIModelBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
