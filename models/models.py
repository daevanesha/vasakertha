from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class BotInfoCard(Base):
    __tablename__ = 'bot_info_card'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(128), default="About D.AI Bot")
    color = Column(String(16), default="#5865F2")
    purpose = Column(Text, default="D.AI is a multi-provider AI assistant for Discord, supporting OpenAI, Anthropic, Gemini, DeepSeek, and Mistral. It offers flexible persona/behavior injection, robust status reporting, and a user-friendly experience.")
    features = Column(Text, default="- Multiple AI providers/models\n- Persona/behavior injection\n- Status and info commands\n- User feedback during response\n- Modern Discord embed UI\n- Ready for multi-user environments")
    commands = Column(Text, default="!status — Show bot status and integrations\n!devinfo — Show this info card\nCustom model commands (e.g. !gpt, !claude, etc.)")
    source_docs = Column(Text, default="[GitHub](https://github.com/) (replace with your repo)")
    footer = Column(String(128), default="Created by Daevaesma | May 2025")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)