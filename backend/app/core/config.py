from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        env_prefix="NEXORA_",
        extra="ignore",
    )

    app_name: str = "Nexora API"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080"]
