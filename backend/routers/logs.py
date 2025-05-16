from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from pydantic import BaseModel
from discord_bots.bot_manager import bot_manager

router = APIRouter(prefix="/logs", tags=["logs"])

class ConversationEntry(BaseModel):
    user_id: str
    channel_id: str
    guild_id: str
    user_message: str
    bot_response: str
    model_name: str

@router.get("/conversations", response_model=List[Dict])
async def get_conversations():
    # Access the conversation history from the bot manager
    conversation_history = bot_manager.conversation_history
    return conversation_history
