from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from config.database import get_db, engine, Base
from models import models
from schemas import schemas
from discord_bots.bot_models import DiscordBot
from discord_bots.bot_schemas import DiscordBotCreate, DiscordBotUpdate, DiscordBot as DiscordBotSchema
from bot_runner import bot_runner
from typing import Tuple
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from routers import providers, models as models_router, bots, bot_model_integrations
from fastapi.staticfiles import StaticFiles
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
def init_db():
    try:
        # Check if we need to create schema
        with engine.connect() as connection:
            # Check if schema exists
            result = connection.execute(text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'public'"))
            schema_exists = result.fetchone() is not None
            
            if not schema_exists:
                connection.execute(text("CREATE SCHEMA public"))
                connection.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
                connection.execute(text("GRANT ALL ON SCHEMA public TO public"))
            
            # Set search path
            connection.execute(text("SET search_path TO public"))
            connection.commit()
        
        # This will only create tables that don't exist yet
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise e

init_db()

app = FastAPI(title="AI Discord Manager API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Use a list of valid origins, e.g. ["http://localhost:5173"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Register modular routers
app.include_router(providers.router)
app.include_router(models_router.router)
app.include_router(bots.router)
app.include_router(bot_model_integrations.router)

# Serve static files for model images
static_dir = os.path.join(os.path.dirname(__file__), '../static/model_images')
os.makedirs(static_dir, exist_ok=True)
app.mount("/model_images", StaticFiles(directory=static_dir), name="model_images")
