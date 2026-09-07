from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Base Application"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    
    # Segurança & JWT
    SECRET_KEY: str = "change_this_to_a_super_secret_key_minimum_32_characters_long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 dias

    # Usuário administrador padrão criado no seed
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"

    # Configurações de Banco de Dados PostgreSQL
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "wallet"
    DATABASE_URL: str | None = None

    def get_database_url(self) -> str:
        """Retorna a URL assíncrona do PostgreSQL para o SQLAlchemy (asyncpg)."""
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgresql://"):
                return url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
