from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from config.database import get_db
from models import models
from schemas import schemas
from typing import List
from routers.bots import bot_runner
from discord_bots.bot_models import DiscordBot

router = APIRouter(prefix="/bot-model-integrations", tags=["bot-model-integrations"])

@router.get("/", response_model=List[schemas.BotModelIntegration])
def list_integrations(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """
    List all bot model integrations with optional pagination
    
    :param skip: Number of records to skip (for pagination)
    :param limit: Maximum number of records to return
    :return: List of bot model integrations
    """
    try:
        integrations = db.query(models.BotModelIntegration).offset(skip).limit(limit).all()
        return integrations
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Database error: {str(e)}"
        )

@router.get("/bot/{bot_id}", response_model=List[schemas.BotModelIntegration])
def get_integrations_for_bot(
    bot_id: int, 
    db: Session = Depends(get_db)
):
    """
    Get all model integrations for a specific bot
    
    :param bot_id: ID of the Discord bot
    :return: List of model integrations for the bot
    """
    # First, verify the bot exists
    bot = db.query(DiscordBot).filter(DiscordBot.id == bot_id).first()
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Bot with ID {bot_id} not found"
        )
    
    integrations = db.query(models.BotModelIntegration).filter(
        models.BotModelIntegration.bot_id == bot_id
    ).all()
    
    return integrations

@router.post("/", response_model=schemas.BotModelIntegration)
def create_integration(
    integration: schemas.BotModelIntegrationCreate, 
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """
    Create a new bot model integration
    
    :param integration: Integration details
    :return: Created integration
    """
    import logging
    logger = logging.getLogger("uvicorn.error")
    logger.info(f"[BotModelIntegration] Incoming payload: {integration}")
    print(f"[DEBUG] Incoming payload: {integration}")
    try:
        # Validate bot exists
        bot = db.query(DiscordBot).filter(DiscordBot.id == integration.bot_id).first()
        print(f"[DEBUG] Bot lookup for id={integration.bot_id}: {bot}")
        if not bot:
            logger.error(f"Bot with ID {integration.bot_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Bot with ID {integration.bot_id} not found"
            )
        
        # Validate model exists and is active
        model = db.query(models.AIModel).filter(models.AIModel.id == integration.model_id).first()
        print(f"[DEBUG] Model lookup for id={integration.model_id}: {model}")
        if not model:
            logger.error(f"AI Model with ID {integration.model_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"AI Model with ID {integration.model_id} not found"
            )
        if not model.is_active:
            logger.error(f"AI Model with ID {integration.model_id} is not active")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"AI Model with ID {integration.model_id} is not active"
            )
        
        # Check for duplicate command for this bot
        existing_integration = db.query(models.BotModelIntegration).filter(
            models.BotModelIntegration.bot_id == integration.bot_id,
            models.BotModelIntegration.command == integration.command
        ).first()
        if existing_integration:
            logger.error(f"Command '{integration.command}' already exists for this bot")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, 
                detail=f"Command '{integration.command}' already exists for this bot"
            )
        
        try:
            # Create the integration
            db_integration = models.BotModelIntegration(**integration.dict())
            db.add(db_integration)
            db.commit()
            db.refresh(db_integration)
            # Restart bot to reload commands
            db_bot = db.query(DiscordBot).filter(DiscordBot.id == integration.bot_id).first()
            if db_bot:
                if background_tasks is not None:
                    background_tasks.add_task(bot_runner.restart_bot, db_bot.id, db_bot.token, db_bot.name)
            return db_integration
        except IntegrityError as e:
            db.rollback()
            logger.error(f"IntegrityError: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Could not create integration due to database constraints"
            )
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"SQLAlchemyError: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Unexpected error creating integration: {str(e)}"
            )
        except Exception as e:
            db.rollback()
            logger.error(f"Unhandled Exception: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Internal server error: {str(e)}"
            )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Could not create integration due to database constraints"
        )
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Unexpected error creating integration: {str(e)}"
        )

@router.put("/{integration_id}", response_model=schemas.BotModelIntegration)
def update_integration(
    integration_id: int, 
    integration: schemas.BotModelIntegrationUpdate, 
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """
    Update an existing bot model integration
    
    :param integration_id: ID of the integration to update
    :param integration: Updated integration details
    :return: Updated integration
    """
    # Find the existing integration
    db_integration = db.query(models.BotModelIntegration).filter(
        models.BotModelIntegration.id == integration_id
    ).first()
    
    if not db_integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Integration not found"
        )
    
    # Validate model if provided
    if integration.model_id is not None:
        model = db.query(models.AIModel).filter(models.AIModel.id == integration.model_id).first()
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"AI Model with ID {integration.model_id} not found"
            )
        if not model.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"AI Model with ID {integration.model_id} is not active"
            )
    
    # Check for duplicate command if updating
    if integration.command is not None:
        existing_command = db.query(models.BotModelIntegration).filter(
            models.BotModelIntegration.bot_id == db_integration.bot_id,
            models.BotModelIntegration.command == integration.command,
            models.BotModelIntegration.id != integration_id
        ).first()
        
        if existing_command:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, 
                detail=f"Command '{integration.command}' already exists for this bot"
            )
    
    try:
        # Update the integration
        for key, value in integration.dict(exclude_unset=True).items():
            setattr(db_integration, key, value)
        
        db.commit()
        db.refresh(db_integration)
        # Restart bot to reload commands
        db_bot = db.query(DiscordBot).filter(DiscordBot.id == db_integration.bot_id).first()
        if db_bot:
            if background_tasks is not None:
                background_tasks.add_task(bot_runner.restart_bot, db_bot.id, db_bot.token, db_bot.name)
        return db_integration
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Could not update integration due to database constraints"
        )
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Unexpected error updating integration: {str(e)}"
        )

@router.delete("/{integration_id}")
def delete_integration(
    integration_id: int, 
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """
    Delete a bot model integration
    
    :param integration_id: ID of the integration to delete
    :return: Deletion confirmation message
    """
    # Find the existing integration
    db_integration = db.query(models.BotModelIntegration).filter(
        models.BotModelIntegration.id == integration_id
    ).first()
    
    if not db_integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Integration not found"
        )
    
    try:
        # Delete the integration
        db.delete(db_integration)
        db.commit()
        # Restart bot to reload commands
        db_bot = db.query(DiscordBot).filter(DiscordBot.id == db_integration.bot_id).first()
        if db_bot:
            if background_tasks is not None:
                background_tasks.add_task(bot_runner.restart_bot, db_bot.id, db_bot.token, db_bot.name)
        return {
            "message": "Integration deleted successfully", 
            "deleted_integration": {
                "id": db_integration.id,
                "bot_id": db_integration.bot_id,
                "model_id": db_integration.model_id,
                "command": db_integration.command
            }
        }
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error deleting integration: {str(e)}"
        )
