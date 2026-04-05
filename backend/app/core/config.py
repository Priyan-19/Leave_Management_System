from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


from typing import Any

class Settings(BaseSettings):
    app_name: str = "Campus Leave Hub API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: Any = Field(default_factory=list)
    firebase_project_id: str = ""
    firebase_storage_bucket: str | None = None
    firebase_service_account_path: str | None = None
    firebase_service_account_json: str | None = None
    default_student_leave_allowance: int = 12
    default_password_length: int = 10
    institution_name: str = "Campus Leave Hub"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
