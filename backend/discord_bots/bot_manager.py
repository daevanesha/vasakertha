import discord
from discord.ext import commands
from typing import Dict, Optional, Tuple
import asyncio
import logging
import traceback
import sqlalchemy
from sqlalchemy.orm import sessionmaker
from config.database import SQLALCHEMY_DATABASE_URL
from models import models as db_models
from discord_bots.bot_models import DiscordBot
import json

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
            embed.add_field(name="Version", value=version, inline=True)
            embed.set_thumbnail(url=bot.user.avatar.url if bot.user.avatar else discord.Embed.Empty)

            # --- Enhancement: List integrated models/commands ---
            # DB access for integrations
            engine = sqlalchemy.create_engine(SQLALCHEMY_DATABASE_URL)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            session = SessionLocal()
            try:
                bot_db = session.query(DiscordBot).filter(DiscordBot.name == name).first()
                if bot_db:
                    integrations = session.query(db_models.BotModelIntegration).filter(db_models.BotModelIntegration.bot_id == bot_db.id).all()
                    if integrations:
                        lines = []
                        for integration in integrations:
                            model = session.query(db_models.AIModel).filter(db_models.AIModel.id == integration.model_id).first()
                            provider = session.query(db_models.AIProvider).filter(db_models.AIProvider.id == model.provider_id).first() if model else None
                            model_name = model.name if model else str(integration.model_id)
                            provider_name = provider.name if provider else 'Unknown'
                            # Get temperature from config if available
                            temp = None
                            try:
                                config_json = json.loads(getattr(model, 'configuration', '{}') or '{}')
                                temp = config_json.get('temperature')
                            except Exception:
                                temp = None
                            # Try integration config as fallback
                            if temp is None and hasattr(integration, 'config') and integration.config:
                                try:
                                    if isinstance(integration.config, dict):
                                        temp = integration.config.get('temperature')
                                    else:
                                        temp = json.loads(integration.config).get('temperature')
                                except Exception:
                                    temp = None
                            temp_str = f" | T={temp}" if temp is not None else ""
                            lines.append(f"`{integration.command}` → {model_name} ({provider_name}{temp_str})")
                        embed.add_field(name="Integrated Commands", value="\n".join(lines), inline=False)
                    else:
                        embed.add_field(name="Integrated Commands", value="No model integrations configured.", inline=False)
                else:
                    embed.add_field(name="Integrated Commands", value="Bot not found in DB.", inline=False)
            except Exception as e:
                embed.add_field(name="Integrated Commands", value=f"Error loading integrations: {e}", inline=False)
            finally:
                session.close()
            # --- End enhancement ---

            # --- General Commands Section ---
            general_commands = [
                ("!status", "Show this status card"),
                ("!devinfo", "Show development info card"),
            ]
            embed.add_field(
                name="General Commands",
                value="\n".join([f"`{cmd}` — {desc}" for cmd, desc in general_commands]),
                inline=False
            )

            # Set footer
            embed.set_footer(text="Develop by Daevaesma")

            await ctx.send(embed=embed)

        @bot.command(name='devinfo')
        async def devinfo(ctx):
            import discord
            import subprocess
            # Get version from git
            try:
                version = subprocess.check_output(['git', 'describe', '--tags', '--always'], cwd='..').decode().strip()
            except Exception:
                version = 'unknown'
            # Get last 10 git commit messages (checkpoints)
            try:
                log_output = subprocess.check_output(['git', 'log', '-10', '--pretty=format:%s'], cwd='..').decode().strip()
                checkpoints = log_output.split('\n') if log_output else []
            except Exception:
                checkpoints = []
            embed = discord.Embed(title="Development Information", color=0x5865F2)
            embed.add_field(name="Version", value=version, inline=False)
            # Discord embed field value limit is 1024 chars
            if checkpoints:
                lines = [f"- {msg}" for msg in checkpoints]
                value = "\n".join(lines)
                if len(value) > 1024:
                    # Truncate and add ellipsis if too long
                    allowed = []
                    total = 0
                    for line in lines:
                        if total + len(line) + 1 > 1024:
                            break
                        allowed.append(line)
                        total += len(line) + 1
                    value = "\n".join(allowed)
                    value += "\n... (truncated)"
                embed.add_field(
                    name="Recent Checkpoints",
                    value=value,
                    inline=False
                )
            else:
                embed.add_field(name="Recent Checkpoints", value="No recent checkpoints found.", inline=False)
            embed.set_footer(text="Develop by Daevaesma | auto-generated from git log")
            await ctx.send(embed=embed)

        # Dynamically register custom commands for model integrations
        engine = sqlalchemy.create_engine(SQLALCHEMY_DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        def register_model_commands():
            session = SessionLocal()
            try:
                bot_db = session.query(DiscordBot).filter(DiscordBot.name == name).first()
                if not bot_db:
                    logger.warning(f"No DB bot found for name {name}")
                    return
                integrations = session.query(db_models.BotModelIntegration).filter(db_models.BotModelIntegration.bot_id == bot_db.id).all()
                for integration in integrations:
                    command_name = integration.command.lstrip('!')
                    model_id = integration.model_id
                    # Fetch model and provider info
                    model = session.query(db_models.AIModel).filter(db_models.AIModel.id == model_id).first()
                    provider = session.query(db_models.AIProvider).filter(db_models.AIProvider.id == model.provider_id).first() if model else None
                    integration_config = integration.config if hasattr(integration, 'config') else {}

                    async def custom_model_command(ctx, *, prompt: str = None, _model_id=model_id, _command=integration.command, _model=model, _provider=provider, _integration_config=integration_config):
                        if not prompt:
                            await ctx.send(f"Usage: {_command} <your prompt>")
                            return
                        try:
                            # --- Buffer message while AI is thinking ---
                            buffer_msg = await ctx.send(f"Preparing answer for {ctx.author.mention} ...")
                            # --- Persona/Behavior injection ---
                            model_id_for_api = getattr(_model, 'model_id', None) or getattr(_model, 'name', None)
                            persona = None
                            try:
                                config_json = json.loads(getattr(_model, 'configuration', '{}') or '{}')
                                persona = config_json.get('behavior') or config_json.get('persona')
                            except Exception:
                                persona = None
                            # --- OpenAI ---
                            if _provider and _provider.name.lower() == 'openai':
                                import openai
                                openai.api_key = _provider.api_key
                                messages = []
                                if persona:
                                    messages.append({"role": "system", "content": persona})
                                messages.append({"role": "user", "content": prompt})
                                response = openai.ChatCompletion.create(
                                    model=model_id_for_api,
                                    messages=messages,
                                    **(_integration_config or {})
                                )
                                reply = response['choices'][0]['message']['content']
                                for chunk in split_message_chunks(reply):
                                    await ctx.send(chunk)
                            # --- Anthropic ---
                            elif _provider and _provider.name.lower() == 'anthropic':
                                import requests
                                api_key = _provider.api_key
                                api_url = getattr(_provider, 'api_url', 'https://api.anthropic.com/v1/messages')
                                headers = {
                                    "x-api-key": api_key,
                                    "anthropic-version": "2023-06-01",
                                    "content-type": "application/json"
                                }
                                messages = []
                                if persona:
                                    messages.append({"role": "system", "content": persona})
                                messages.append({"role": "user", "content": prompt})
                                data = {
                                    "model": model_id_for_api,
                                    "max_tokens": _integration_config.get("max_tokens", 1024) if _integration_config else 1024,
                                    "messages": messages,
                                    "temperature": _integration_config.get("temperature", 0.7) if _integration_config else 0.7
                                }
                                resp = requests.post(api_url, json=data, headers=headers, timeout=30)
                                if resp.status_code == 200:
                                    reply = resp.json().get('content', [{}])[0].get('text', 'No response')
                                    for chunk in split_message_chunks(reply):
                                        await ctx.send(chunk)
                                else:
                                    await ctx.send(f"Anthropic API error: {resp.status_code} {resp.text}")
                            # --- Gemini ---
                            elif _provider and _provider.name.lower() == 'gemini':
                                import requests
                                api_key = _provider.api_key
                                api_url = getattr(_provider, 'api_url', f"https://generativelanguage.googleapis.com/v1beta/models/{model_id_for_api}:generateContent?key={api_key}")
                                headers = {"content-type": "application/json"}
                                parts = []
                                if persona:
                                    parts.append({"text": persona})
                                parts.append({"text": prompt})
                                data = {
                                    "contents": [{"parts": parts}]
                                }
                                resp = requests.post(api_url, json=data, headers=headers, timeout=30)
                                if resp.status_code == 200:
                                    candidates = resp.json().get('candidates', [])
                                    reply = candidates[0]['content']['parts'][0]['text'] if candidates and 'content' in candidates[0] and 'parts' in candidates[0]['content'] and candidates[0]['content']['parts'] else 'No response'
                                    for chunk in split_message_chunks(reply):
                                        await ctx.send(chunk)
                                else:
                                    await ctx.send(f"Gemini API error: {resp.status_code} {resp.text}")
                            # --- DeepSeek ---
                            elif _provider and _provider.name.lower() == 'deepseek':
                                import requests
                                api_key = _provider.api_key
                                api_url = getattr(_provider, 'api_url', 'https://api.deepseek.com/v1/chat/completions')
                                headers = {
                                    "Authorization": f"Bearer {api_key}",
                                    "content-type": "application/json"
                                }
                                messages = []
                                if persona:
                                    messages.append({"role": "system", "content": persona})
                                messages.append({"role": "user", "content": prompt})
                                data = {
                                    "model": model_id_for_api,
                                    "messages": messages,
                                    "max_tokens": _integration_config.get("max_tokens", 1024) if _integration_config else 1024,
                                    "temperature": _integration_config.get("temperature", 0.7) if _integration_config else 0.7
                                }
                                resp = requests.post(api_url, json=data, headers=headers, timeout=30)
                                if resp.status_code == 200:
                                    reply = resp.json().get('choices', [{}])[0].get('message', {}).get('content', 'No response')
                                    for chunk in split_message_chunks(reply):
                                        await ctx.send(chunk)
                                else:
                                    await ctx.send(f"DeepSeek API error: {resp.status_code} {resp.text}")
                            # --- Mistral ---
                            elif _provider and _provider.name.lower() == 'mistral':
                                import requests
                                api_key = _provider.api_key
                                api_url = getattr(_provider, 'api_url', 'https://api.mistral.ai/v1/chat/completions')
                                headers = {
                                    "Authorization": f"Bearer {api_key}",
                                    "content-type": "application/json"
                                }
                                messages = []
                                if persona:
                                    messages.append({"role": "system", "content": persona})
                                messages.append({"role": "user", "content": prompt})
                                data = {
                                    "model": model_id_for_api,
                                    "messages": messages,
                                    "max_tokens": _integration_config.get("max_tokens", 1024) if _integration_config else 1024,
                                    "temperature": _integration_config.get("temperature", 0.7) if _integration_config else 0.7
                                }
                                resp = requests.post(api_url, json=data, headers=headers, timeout=30)
                                if resp.status_code == 200:
                                    reply = resp.json().get('choices', [{}])[0].get('message', {}).get('content', 'No response')
                                    for chunk in split_message_chunks(reply):
                                        await ctx.send(chunk)
                                else:
                                    await ctx.send(f"Mistral API error: {resp.status_code} {resp.text}")
                            else:
                                await ctx.send(f"Unsupported provider: {getattr(_provider, 'name', 'Unknown')}")
                            await buffer_msg.delete()
                        except Exception as e:
                            logger.error(f"Error in custom model command: {traceback.format_exc()}")
                            error_chunks = split_message_chunks(f"An error occurred: {str(e)}\n\nDetails:\n{traceback.format_exc()}")
                            for chunk in error_chunks:
                                await ctx.send(chunk)
                    custom_model_command.__name__ = command_name
                    bot.command(name=command_name)(custom_model_command)
            finally:
                session.close()
        register_model_commands()

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

def split_message_chunks(message, chunk_size=2000, code_block=False):
    """
    Split a long message into chunks suitable for Discord (max 2000 chars).
    
    Args:
        message (str): The message to split
        chunk_size (int): Maximum size of each chunk (default: 2000)
        code_block (bool): Whether to wrap each chunk in a code block (optional)
    
    Returns:
        list: A list of message chunks
    """
    # Handle None or empty messages
    if not message:
        return []
    
    # Convert message to string to ensure consistent handling
    message = str(message)
    
    # Adjust chunk size for code block markers if needed
    if code_block:
        chunk_size -= 6  # Account for ```\n and ```
    
    # If message is already short enough, return as single chunk
    if len(message) <= chunk_size:
        return [f"```{message}```"] if code_block else [message]
    
    # Split message into chunks, trying to split at whitespace
    chunks = []
    while message:
        # Prepare chunk with code block if needed
        if code_block:
            # If remaining message is short, include entire message
            if len(message) <= chunk_size:
                chunks.append(f"```{message}```")
                break
            
            # Find the last whitespace before chunk_size
            split_index = message[:chunk_size].rfind(' ')
            
            # If no whitespace found, force split at chunk_size
            if split_index == -1:
                split_index = chunk_size
            
            # Add chunk and continue with remaining message
            chunks.append(f"```{message[:split_index].strip()}```")
            message = message[split_index:].strip()
        else:
            # If message is already short enough, add and break
            if len(message) <= chunk_size:
                chunks.append(message)
                break
            
            # Find the last whitespace before chunk_size
            split_index = message[:chunk_size].rfind(' ')
            
            # If no whitespace found, force split at chunk_size
            if split_index == -1:
                split_index = chunk_size
            
            # Add chunk and continue with remaining message
            chunks.append(message[:split_index].strip())
            message = message[split_index:].strip()
    
    return chunks