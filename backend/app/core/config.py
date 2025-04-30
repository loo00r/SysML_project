from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_PREFIX: str

    OPENAI_API_KEY: str
    OPENAI_GENERATIVE_MODEL: str


    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

#sg dgs
