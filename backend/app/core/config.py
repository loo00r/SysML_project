from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_PREFIX: str

    OPENAI_API_KEY: str
    OPENAI_GENERATIVE_MODEL: str
    
    # Database settings
    DB_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/postgres"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
