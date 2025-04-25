from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/ping", tags=["Ping"])

@router.get("/")
async def ping():
    return {"message": "pong"}