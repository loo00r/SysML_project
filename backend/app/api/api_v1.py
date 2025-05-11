from fastapi import APIRouter
from app.core.config import settings
from app.test.ping import router as ping_router
from app.diagrams.create_diagram import router as create_diagram_router
from app.database.rag_router import router as rag_router

router = APIRouter(prefix=settings.API_PREFIX)
router.include_router(ping_router)
router.include_router(create_diagram_router)
router.include_router(rag_router)
