from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api_v1 import router
from app.db.session import engine
from app.db.base import Base

app = FastAPI(
    title="SysML API",
    description="API for SysML diagram generation and management",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

@app.on_event("startup")
async def startup():
    # Create tables if they don't exist
    # In production, you'd use Alembic migrations instead
    async with engine.begin() as conn:
        # Create tables automatically on startup
        await conn.run_sync(Base.metadata.create_all)
        print("Database tables created successfully")

@app.on_event("shutdown")
async def shutdown():
    # Close the database connection pool
    await engine.dispose()

app.include_router(router)
