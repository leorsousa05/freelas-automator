from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./dev.db"
    encryption_key: str = ""
    twocaptcha_api_key: str = ""
    scheduler_interval_minutes: int = 15
    max_workers: int = 5
    playwright_headless: bool = True
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"


settings = Settings()
