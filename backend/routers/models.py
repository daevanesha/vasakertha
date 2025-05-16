from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
from sqlalchemy.orm import Session
from config.database import get_db
from models import models
from schemas import schemas
import httpx

router = APIRouter(prefix="/models", tags=["models"])

@router.post("/", response_model=schemas.AIModel)
def create_model(model: schemas.AIModelCreate, db: Session = Depends(get_db)):
    db_model = models.AIModel(**model.dict())
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model

@router.get("/", response_model=list[schemas.AIModel])
def list_models(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), request: Request = None):
    models_ = db.query(models.AIModel).offset(skip).limit(limit).all()
    # Patch image_url to absolute and add provider_name
    result = []
    for m in models_:
        model_dict = m.__dict__.copy()
        if hasattr(m, 'provider') and m.provider:
            model_dict['provider_name'] = m.provider.name
        else:
            # Try to fetch provider if not loaded
            provider = db.query(models.AIProvider).filter(models.AIProvider.id == m.provider_id).first()
            model_dict['provider_name'] = provider.name if provider else 'Unknown'
        if m.image_url and not m.image_url.startswith("http") and request:
            base_url = str(request.base_url).rstrip('/')
            model_dict['image_url'] = f"{base_url}{m.image_url}"
        result.append(model_dict)
    return result

@router.get("/active", response_model=list[schemas.AIModel])
def get_active_models(db: Session = Depends(get_db), request: Request = None):
    models_list = db.query(models.AIModel).filter(models.AIModel.active == True).all()
    if request:
        base_url = str(request.base_url).rstrip('/')
        for m in models_list:
            if m.image_url and not m.image_url.startswith("http"):
                m.image_url = f"{base_url}{m.image_url}"
    return models_list

@router.get("/proxy-image")
def proxy_image(url: str = Query(..., description="Public Supabase Storage image URL")):
    # Only allow proxying images from the expected Supabase bucket for security
    allowed_prefix = "https://mfwltcjggfqebyoefebw.supabase.co/storage/v1/object/public/model-images/"
    if not url.startswith(allowed_prefix):
        raise HTTPException(status_code=400, detail="Invalid image URL")
    try:
        with httpx.Client() as client:
            r = client.get(url)
            if r.status_code != 200:
                raise HTTPException(status_code=404, detail="Image not found")
            headers = {
                "Content-Type": r.headers.get("content-type", "image/png"),
                "Access-Control-Allow-Origin": "*"
            }
            return Response(content=r.content, headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}")

@router.get("/{model_id}", response_model=schemas.AIModel)
def get_model(model_id: int, db: Session = Depends(get_db), request: Request = None):
    model = db.query(models.AIModel).filter(models.AIModel.id == model_id).first()
    if model and model.image_url and not model.image_url.startswith("http") and request:
        base_url = str(request.base_url).rstrip('/')
        model.image_url = f"{base_url}{model.image_url}"
    return model

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
