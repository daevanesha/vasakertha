from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from config.database import get_db
from discord_bots.bot_models import DiscordBot
from discord_bots.bot_schemas import DiscordBotCreate, DiscordBotUpdate, DiscordBot as DiscordBotSchema
from bot_runner import bot_runner
from models import models
from typing import Tuple

router = APIRouter(prefix="/discord-bots", tags=["discord-bots"])

@router.post("/", response_model=DiscordBotSchema)
async def create_bot(bot: DiscordBotCreate, db: Session = Depends(get_db)):
    if bot.model_id:
        model = db.query(models.AIModel).filter(models.AIModel.id == bot.model_id).first()
        if not model:
            raise HTTPException(status_code=404, detail="AI Model not found")
        if not model.is_active:
            raise HTTPException(status_code=400, detail="Selected AI Model is not active")
    db_bot = DiscordBot(name=bot.name, token=bot.token, model_id=bot.model_id)
    db.add(db_bot)
    db.commit()
    db.refresh(db_bot)
    success, message = await bot_runner.start_bot(db_bot.id, bot.token, bot.name)
    if not success:
        db_bot.is_active = False
        db.commit()
        raise HTTPException(status_code=400, detail=message)
    db_bot.is_active = True
    db.commit()
    db.refresh(db_bot)
    return db_bot

@router.get("/", response_model=list[DiscordBotSchema])
async def get_bots(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    bots = db.query(DiscordBot).offset(skip).limit(limit).all()
    for bot in bots:
        bot.is_active = bot_runner.get_bot_status(bot.id)
        # Fetch guilds from the running bot instance if available
        running_bot = bot_runner.manager.get_bot(bot.id)
        guilds = []
        if running_bot is not None and hasattr(running_bot, 'guilds'):
            try:
                # guilds is a list of discord.Guild objects
                guilds = [{"id": str(guild.id), "name": guild.name} for guild in getattr(running_bot, 'guilds', [])]
            except Exception as e:
                guilds = []
        bot.guilds = guilds
    db.commit()
    return bots

@router.get("/{bot_id}", response_model=DiscordBotSchema)
def get_bot(bot_id: int, db: Session = Depends(get_db)):
    db_bot = db.query(DiscordBot).filter(DiscordBot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    db_bot.is_active = bot_runner.get_bot_status(bot_id)
    db.commit()
    return db_bot

@router.put("/{bot_id}", response_model=DiscordBotSchema)
async def update_bot(bot_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    db_bot = db.query(DiscordBot).filter(DiscordBot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    if 'name' in data:
        db_bot.name = data['name']
    if 'token' in data:
        db_bot.token = data['token']
    db.commit()
    db.refresh(db_bot)
    return db_bot

@router.delete("/{bot_id}")
async def delete_bot(bot_id: int, db: Session = Depends(get_db)):
    db_bot = db.query(DiscordBot).filter(DiscordBot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    if bot_runner.get_bot_status(bot_id):
        success, message = await bot_runner.stop_bot(bot_id)
        if not success:
            raise HTTPException(status_code=500, detail=message)
    db.delete(db_bot)
    db.commit()
    return {"message": "Bot deleted successfully"}

@router.post("/{bot_id}/restart")
async def restart_bot(bot_id: int, db: Session = Depends(get_db)):
    db_bot = db.query(DiscordBot).filter(DiscordBot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    success, message = await bot_runner.restart_bot(bot_id, db_bot.token, db_bot.name)
    if not success:
        db_bot.is_active = False
        db.commit()
        raise HTTPException(status_code=400, detail=message)
    db_bot.is_active = True
    db.commit()
    return {"message": "Bot restarted successfully"}

@router.post("/{bot_id}/stop")
async def stop_bot(bot_id: int, db: Session = Depends(get_db)):
    db_bot = db.query(DiscordBot).filter(DiscordBot.id == bot_id).first()
    if not db_bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    if not bot_runner.get_bot_status(bot_id):
        db_bot.is_active = False
        db.commit()
        return {"message": "Bot is already stopped"}
    success, message = await bot_runner.stop_bot(bot_id)
    if not success:
        raise HTTPException(status_code=500, detail=message)
    db_bot.is_active = False
    db.commit()
    return {"message": "Bot stopped successfully"}
