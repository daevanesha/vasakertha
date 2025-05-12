import discord
from discord.ext import commands
from typing import Dict, Optional, Tuple
import asyncio
import logging
import traceback

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DaeBotManager:
    def __init__(self):
        self.bots: Dict[int, commands.Bot] = {}

    def setup_bot(self, bot: commands.Bot, name: str) -> None:
        @bot.event
        async def on_ready():
            logger.info(f'Bot {name} is ready and connected as {bot.user}')
            logger.info(f'Bot is in following guilds: {[guild.name for guild in bot.guilds]}')
            logger.info(f'Command prefix is: {bot.command_prefix}')

        @bot.event
        async def on_message(message):
            if message.author == bot.user:
                return
            
            logger.info(f'Received message: "{message.content}" from {message.author} in {message.guild.name if message.guild else "DM"}')
            logger.info(f'Message type: {message.type}, Is command: {message.content.startswith("!")}, Bot mentioned: {bot.user in message.mentions}')
            
            await bot.process_commands(message)

        @bot.event
        async def on_command_error(ctx, error):
            logger.error(f'Command error: {str(error)}')
            await ctx.send(f'Error executing command: {str(error)}')

        @bot.command(name='ping')
        async def ping(ctx):
            logger.info(f'Executing ping command for {ctx.author} in {ctx.guild.name if ctx.guild else "DM"}')
            try:
                await ctx.send(f'🟢 Bot is active! Response time: {round(bot.latency * 1000)}ms')
                logger.info('Ping command executed successfully')
            except Exception as e:
                logger.error(f'Error in ping command: {str(e)}')
                raise

    async def create_bot(self, bot_id: int, token: str, name: str) -> Tuple[bool, str]:
        try:
            # Enable ALL intents
            intents = discord.Intents.all()
            logger.info(f"Creating bot {name} with all intents enabled")
            
            # Create and setup bot
            bot = commands.Bot(command_prefix='!', intents=intents, help_command=None)
            self.setup_bot(bot, name)
            
            try:
                # Create background task for bot
                task = asyncio.create_task(bot.start(token))
                self.bots[bot_id] = bot
                
                # Wait a bit to check if login succeeds
                await asyncio.sleep(2)
                
                if bot.is_closed():
                    error_msg = f'Bot {name} failed to start - connection closed'
                    logger.error(error_msg)
                    return False, error_msg
                
                return True, "Bot started successfully"
                
            except discord.LoginFailure as e:
                error_msg = f'Failed to login bot {name}: Invalid token'
                logger.error(f'{error_msg}: {str(e)}')
                return False, error_msg
            except Exception as e:
                error_msg = f'Failed to start bot {name}: {str(e)}'
                logger.error(f'{error_msg}\n{traceback.format_exc()}')
                return False, error_msg
                
        except Exception as e:
            error_msg = f'Error creating bot {name}: {str(e)}'
            logger.error(f'{error_msg}\n{traceback.format_exc()}')
            return False, error_msg
    
    async def stop_bot(self, bot_id: int) -> bool:
        try:
            if bot_id in self.bots:
                bot = self.bots[bot_id]
                await bot.close()
                del self.bots[bot_id]
                return True
            return False
        except Exception as e:
            logger.error(f'Error stopping bot {bot_id}: {str(e)}')
            return False

    def get_bot(self, bot_id: int) -> Optional[commands.Bot]:
        return self.bots.get(bot_id)

# Create a global bot manager instance
bot_manager = DaeBotManager()