from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_PREFIX: str

    OPENAI_API_KEY: str
    OPENAI_GENERATIVE_MODEL: str
    
    # Application version
    APP_VERSION: str = "1.0"
    
    # Database settings
    DB_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/postgres"
    DB_URL_SYNC: str = "postgresql+psycopg2://postgres:postgres@db:5432/postgres"
    
    # Redis settings
    REDIS_URL: str = "redis://redis:6379/0"
    REDIS_TTL: int = 3600  # 60 minutes TTL for diagram cache

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
