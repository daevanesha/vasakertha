from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Dict
from pydantic import BaseModel
from discord_bots.bot_manager import bot_manager
import os
import json

router = APIRouter()

class ConversationEntry(BaseModel):
    user_id: str
    channel_id: str
    guild_id: str
    user_message: str
    bot_response: str
    model_name: str

CONVERSATION_LOGS_FILE = os.path.join(os.path.dirname(__file__), '../conversation_logs.jsonl')

@router.get("/conversation_logs", response_model=List[Dict])
async def get_conversation_logs(
    user_id: str = Query(None),
    channel_id: str = Query(None),
    guild_id: str = Query(None),
    model_name: str = Query(None),
    bot_id: str = Query(None),
    user_name: str = Query(None),
    channel_name: str = Query(None),
    guild_name: str = Query(None)
):
    logs = []
    def norm(val):
        if val is None:
            return None
        return str(val).strip()
    user_id = norm(user_id)
    channel_id = norm(channel_id)
    guild_id = norm(guild_id)
    model_name = norm(model_name)
    bot_id = norm(bot_id)
    user_name = norm(user_name)
    channel_name = norm(channel_name)
    guild_name = norm(guild_name)
    if not os.path.exists(CONVERSATION_LOGS_FILE):
        return []
    with open(CONVERSATION_LOGS_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                entry = json.loads(line)
                # Always normalize log values to string for comparison
                if user_id and norm(entry.get("user_id")) != user_id:
                    continue
                if channel_id and norm(entry.get("channel_id")) != channel_id:
                    continue
                if guild_id and norm(entry.get("guild_id")) != guild_id:
                    continue
                if model_name and norm(entry.get("model_name")) != model_name:
                    continue
                if bot_id and norm(entry.get("bot_id")) != bot_id:
                    continue
                if user_name and norm(entry.get("user_name")) != user_name:
                    continue
                if channel_name and norm(entry.get("channel_name")) != channel_name:
                    continue
                if guild_name and norm(entry.get("guild_name")) != guild_name:
                    continue
                logs.append(entry)
            except Exception:
                continue
    return logs
