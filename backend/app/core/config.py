from pathlib import Path

from pydantic import Field, field_validator
from sqlalchemy.engine import make_url

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

    database_url: str = Field(validation_alias="DATABASE_URL", repr=False)

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        """Use PostgreSQL with the installed synchronous psycopg 3 driver."""
        try:
            url = make_url(value)
        except Exception:
            raise ValueError("DATABASE_URL must be a valid PostgreSQL URL") from None
        if url.drivername not in {"postgresql", "postgresql+psycopg"}:
            raise ValueError("DATABASE_URL must use postgresql or postgresql+psycopg")
        if not url.database:
            raise ValueError("DATABASE_URL must include a database name")
        return url.set(drivername="postgresql+psycopg").render_as_string(hide_password=False)
