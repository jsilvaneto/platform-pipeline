import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "wallet_super_secret_local_key_2026_change_if_needed"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 dias

    # Google Sheets Integration
    GOOGLE_SERVICE_ACCOUNT_FILE: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "credentials.json"
    )
    GOOGLE_SPREADSHEET_ID: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
