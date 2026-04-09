from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    # Database — Docker service hostname
    DATABASE_URL: str = "postgresql+asyncpg://logistics:secret@postgres:5432/logistics"

    # AI keys (optional — demo mode works without them)
    OPENAI_API_KEY:    str = ""
    ANTHROPIC_API_KEY: str = ""

    # Redis — Docker service hostname
    REDIS_URL: str = "redis://redis:6379"

    # Port
    PORT_AI: int = 8001

    model_config = {"env_file": ".env", "extra": "ignore"}

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
