from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PORT: int = 8001
    AI_PROVIDER: str = "anthropic"
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    MODEL_ID: str = "claude-sonnet-4-6"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    # URL of the API gateway — used by tools that call the institute service
    INSTITUTE_API_URL: str = "http://localhost:5001"
    # URL of the voice agent service (kept for backwards compat, not used for KB search)
    VOICE_AGENT_URL: str = "http://localhost:8000"
    # Qdrant — same instance used by the voice agent for course KB
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""

    @property
    def cors_allow_all(self) -> bool:
        return self.CORS_ORIGINS.strip() == "*"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
