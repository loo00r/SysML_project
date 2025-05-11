from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_PREFIX: str

    OPENAI_API_KEY: str
    OPENAI_GENERATIVE_MODEL: str
    
    # Database settings
    DB_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/postgres"
    DB_URL_SYNC: str = "postgresql+psycopg2://postgres:postgres@db:5432/postgres"
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@db:5432/postgres"  # Keep for compatibility

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
