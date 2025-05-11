from fastapi import APIRouter
from app.core.config import settings
from app.test.ping import router as ping_router
from app.diagrams.create_diagram import router as create_diagram_router

# Import the RAG router
try:
    from app.database.rag_router import router as rag_router
    has_rag = True
except ImportError:
    # In case the database components aren't set up yet
    has_rag = False

router = APIRouter(prefix=settings.API_PREFIX)
router.include_router(ping_router)
router.include_router(create_diagram_router)

# Conditionally include the RAG router if database is set up
if has_rag:
    router.include_router(rag_router)
