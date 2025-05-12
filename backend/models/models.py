from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from config.database import Base

class AIProvider(Base):
    __tablename__ = "ai_providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    api_key = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    models = relationship("AIModel", back_populates="provider")

class AIModel(Base):
    __tablename__ = "ai_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    provider_id = Column(Integer, ForeignKey("ai_providers.id"))
    model_id = Column(String)  # The actual model ID used by the provider
    configuration = Column(Text)  # JSON string for model-specific configuration
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    provider = relationship("AIProvider", back_populates="models")

class BotModelIntegration(Base):
    __tablename__ = "bot_model_integrations"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("discord_bots.id"))
    model_id = Column(Integer, ForeignKey("ai_models.id"))
    command = Column(String, nullable=False)
    # Optionally, add config if you use it: config = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    bot = relationship("DiscordBot", backref="model_integrations")
    model = relationship("AIModel")
