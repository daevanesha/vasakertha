import asyncio
import logging
from typing import Tuple
from discord_bots.bot_manager import DaeBotManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BotRunner:
    def __init__(self):
        """Initialize the BotRunner with a DaeBotManager instance"""
        self.manager = DaeBotManager()
        
    async def start_bot(self, bot_id: int, token: str, name: str) -> Tuple[bool, str]:
        """Start a new Discord bot with the given token and name"""
        try:
            # Create and start the bot in an asyncio task
            success, message = await self.manager.create_bot(bot_id, token, name)
            
            if success:
                logger.info(f"Successfully started bot {name} (ID: {bot_id})")
            else:
                logger.error(f"Failed to start bot {name} (ID: {bot_id}): {message}")
            return success, message
        except Exception as e:
            error_msg = f"Unexpected error starting bot {name} (ID: {bot_id}): {str(e)}"
            logger.error(error_msg)
            return False, error_msg

    async def stop_bot(self, bot_id: int) -> Tuple[bool, str]:
        """Stop a running Discord bot"""
        try:
            if not self.get_bot_status(bot_id):
                return True, "Bot is already stopped"
            
            success = await self.manager.stop_bot(bot_id)
            if success:
                logger.info(f"Successfully stopped bot {bot_id}")
                return True, "Bot stopped successfully"
            else:
                error_msg = f"Failed to stop bot {bot_id}"
                logger.error(error_msg)
                return False, error_msg
        except Exception as e:
            error_msg = f"Unexpected error stopping bot {bot_id}: {str(e)}"
            logger.error(error_msg)
            return False, error_msg

    def get_bot_status(self, bot_id: int) -> bool:
        """Check if a bot is running"""
        try:
            bot = self.manager.get_bot(bot_id)
            if bot is None:
                return False
            return not bot.is_closed()
        except Exception as e:
            logger.error(f"Error checking bot {bot_id} status: {str(e)}")
            return False

    async def restart_bot(self, bot_id: int, token: str, name: str) -> Tuple[bool, str]:
        """Restart a Discord bot"""
        try:
            # Stop the bot first
            stop_success, stop_message = await self.stop_bot(bot_id)
            if not stop_success:
                logger.warning(f"Failed to stop bot during restart: {stop_message}")
                # Continue anyway since we'll try to start a new instance
            
            # Wait a bit to ensure cleanup
            await asyncio.sleep(1)
            
            # Start the bot again
            success, message = await self.start_bot(bot_id, token, name)
            if success:
                logger.info(f"Successfully restarted bot {name} (ID: {bot_id})")
                return True, "Bot restarted successfully"
            else:
                error_msg = f"Failed to restart bot: {message}"
                logger.error(error_msg)
                return False, error_msg
        except Exception as e:
            error_msg = f"Unexpected error restarting bot {bot_id}: {str(e)}"
            logger.error(error_msg)
            return False, error_msg

# Create a global instance that can be imported by FastAPI
bot_runner = BotRunner()