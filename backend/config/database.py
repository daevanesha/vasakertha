from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL='postgresql://postgres:[Hablumminannas758170!]@db.mfwltcjggfqebyoefebw.supabase.co:5432/postgres'
SQLALCHEMY_DATABASE_URL = 'postgresql://postgres.mfwltcjggfqebyoefebw:Hablumminannas758170!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
