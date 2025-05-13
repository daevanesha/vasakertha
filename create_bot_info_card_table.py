from models import models as db_models
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config.database import SQLALCHEMY_DATABASE_URL

def create_bot_info_card_table():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    db_models.Base.metadata.create_all(engine, tables=[db_models.BotInfoCard.__table__])

if __name__ == "__main__":
    create_bot_info_card_table()
    print("BotInfoCard table created (if not exists)")
