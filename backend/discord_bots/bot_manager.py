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

        # Removed the !ping command as requested

        @bot.command(name='status')
        async def status(ctx):
            import discord
            import subprocess
            # Get version from git
            try:
                version = subprocess.check_output(['git', 'describe', '--tags', '--always'], cwd='..').decode().strip()
            except Exception:
                version = 'unknown'
            embed = discord.Embed(title="D.AI", color=0x23272A)
            embed.add_field(name="Bot ID:", value=f"`{bot.user.id}`", inline=False)
            embed.add_field(name="Version", value=version, inline=True)
            embed.add_field(name="Creator", value="Daevaesma", inline=True)
            embed.set_thumbnail(url=bot.user.avatar.url if bot.user.avatar else discord.Embed.Empty)
            await ctx.send(embed=embed)

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