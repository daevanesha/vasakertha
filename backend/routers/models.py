from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from models import models
from schemas import schemas

router = APIRouter(prefix="/models", tags=["models"])

@router.post("/", response_model=schemas.AIModel)
def create_model(model: schemas.AIModelCreate, db: Session = Depends(get_db)):
    db_model = models.AIModel(**model.dict())
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model

@router.get("/", response_model=list[schemas.AIModel])
def get_models(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    models_list = db.query(models.AIModel).offset(skip).limit(limit).all()
    return models_list

@router.put("/{model_id}", response_model=schemas.AIModel)
def update_model(model_id: int, model: schemas.AIModelUpdate, db: Session = Depends(get_db)):
    db_model = db.query(models.AIModel).filter(models.AIModel.id == model_id).first()
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    for key, value in model.dict(exclude_unset=True).items():
        setattr(db_model, key, value)
    db.commit()
    db.refresh(db_model)
    return db_model

@router.delete("/{model_id}")
def delete_model(model_id: int, db: Session = Depends(get_db)):
    db_model = db.query(models.AIModel).filter(models.AIModel.id == model_id).first()
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    db.delete(db_model)
    db.commit()
    return {"message": "Model deleted successfully"}
