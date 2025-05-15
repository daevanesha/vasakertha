from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from models import models
from schemas import schemas

router = APIRouter(prefix="/providers", tags=["providers"])

@router.post("/", response_model=schemas.AIProvider)
def create_provider(provider: schemas.AIProviderCreate, db: Session = Depends(get_db)):
    db_provider = models.AIProvider(**provider.dict())
    db.add(db_provider)
    db.commit()
    db.refresh(db_provider)
    return db_provider

@router.get("/", response_model=list[schemas.AIProvider])
def get_providers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    providers = db.query(models.AIProvider).offset(skip).limit(limit).all()
    return providers

@router.delete("/{provider_id}")
def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    provider = db.query(models.AIProvider).filter(models.AIProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    db.delete(provider)
    db.commit()
    return {"message": "Provider deleted successfully"}
