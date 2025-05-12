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
                            lines.append(f"`{integration.command}` → {model_name} ({provider_name})")
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
                            model_id_for_api = getattr(_model, 'model_id', None) or getattr(_model, 'name', None)
                            # --- OpenAI ---
                            if _provider and _provider.name.lower() == 'openai':
                                import openai
                                openai.api_key = _provider.api_key
                                response = openai.ChatCompletion.create(
                                    model=model_id_for_api,
                                    messages=[{"role": "user", "content": prompt}],
                                    **(_integration_config or {})
                                )
                                reply = response['choices'][0]['message']['content']
                                await ctx.send(reply)
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
                                data = {
                                    "model": model_id_for_api,
                                    "max_tokens": _integration_config.get("max_tokens", 1024) if _integration_config else 1024,
                                    "messages": [{"role": "user", "content": prompt}],
                                    "temperature": _integration_config.get("temperature", 0.7) if _integration_config else 0.7
                                }
                                resp = requests.post(api_url, json=data, headers=headers, timeout=30)
                                if resp.status_code == 200:
                                    reply = resp.json().get('content', [{}])[0].get('text', 'No response')
                                    await ctx.send(reply)
                                else:
                                    await ctx.send(f"Anthropic API error: {resp.status_code} {resp.text}")
                            # --- Gemini ---
                            elif _provider and _provider.name.lower() == 'gemini':
                                import requests
                                api_key = _provider.api_key
                                api_url = getattr(_provider, 'api_url', f"https://generativelanguage.googleapis.com/v1beta/models/{model_id_for_api}:generateContent?key={api_key}")
                                headers = {"content-type": "application/json"}
                                data = {
                                    "contents": [{"parts": [{"text": prompt}]}]
                                }
                                resp = requests.post(api_url, json=data, headers=headers, timeout=30)
                                if resp.status_code == 200:
                                    candidates = resp.json().get('candidates', [])
                                    reply = candidates[0]['content']['parts'][0]['text'] if candidates and 'content' in candidates[0] and 'parts' in candidates[0]['content'] and candidates[0]['content']['parts'] else 'No response'
                                    await ctx.send(reply)
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
                                data = {
                                    "model": model_id_for_api,
                                    "messages": [{"role": "user", "content": prompt}],
                                    "max_tokens": _integration_config.get("max_tokens", 1024) if _integration_config else 1024,
                                    "temperature": _integration_config.get("temperature", 0.7) if _integration_config else 0.7
                                }
                                resp = requests.post(api_url, json=data, headers=headers, timeout=30)
                                if resp.status_code == 200:
                                    reply = resp.json().get('choices', [{}])[0].get('message', {}).get('content', 'No response')
                                    await ctx.send(reply)
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
                                data = {
                                    "model": model_id_for_api,
                                    "messages": [{"role": "user", "content": prompt}],
                                    "max_tokens": _integration_config.get("max_tokens", 1024) if _integration_config else 1024,
                                    "temperature": _integration_config.get("temperature", 0.7) if _integration_config else 0.7
                                }
                                resp = requests.post(api_url, json=data, headers=headers, timeout=30)
                                if resp.status_code == 200:
                                    reply = resp.json().get('choices', [{}])[0].get('message', {}).get('content', 'No response')
                                    await ctx.send(reply)
                                else:
                                    await ctx.send(f"Mistral API error: {resp.status_code} {resp.text}")
                            else:
                                await ctx.send(f"[Model {_model_id}] Provider not supported or not configured.")
                        except Exception as e:
                            logger.error(f"Model call failed: {str(e)}")
                            await ctx.send(f"Error: Model call failed. {str(e)}")
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