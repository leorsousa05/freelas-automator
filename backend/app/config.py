from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://freelas:freelas@db:5432/freelas"
    encryption_key: str = ""
    twocaptcha_api_key: str = ""
    scheduler_interval_minutes: int = 30
    max_workers: int = 5
    playwright_headless: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
