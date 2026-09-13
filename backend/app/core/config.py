import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_app_version() -> str:
    """Resolve a versão da aplicação priorizando env, arquivo VERSION ou fallback seguro."""
    env_ver = os.getenv("APP_VERSION")
    if env_ver and env_ver.strip():
        return env_ver.strip()

    candidate_paths = [
        Path(__file__).resolve().parents[2] / "VERSION",  # backend/VERSION
        Path(__file__).resolve().parents[3] / "VERSION",  # project_root/VERSION
        Path("/app/VERSION"),
    ]
    for path in candidate_paths:
        if path.is_file():
            try:
                content = path.read_text(encoding="utf-8").strip()
                if content:
                    return content
            except Exception:
                pass
    return "1.0.1"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Wallet"
    APP_VERSION: str = _resolve_app_version()
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

    # Configurações de Backup & Google Drive
    BACKUPS_DIR: str = "backups"
    BACKUP_RETENTION_DAYS: int = 30
    GOOGLE_APPLICATION_CREDENTIALS: str | None = None
    GOOGLE_DRIVE_FOLDER_ID: str | None = None
    GOOGLE_OAUTH_CLIENT_ID: str | None = None
    GOOGLE_OAUTH_CLIENT_SECRET: str | None = None

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

    def resolve_credentials_path(self) -> Path | None:
        """Resolve o caminho do arquivo de credenciais do Google Drive."""
        candidate_paths: list[Path] = []
        if self.GOOGLE_APPLICATION_CREDENTIALS:
            candidate_paths.append(Path(self.GOOGLE_APPLICATION_CREDENTIALS))
        
        # Candidatos padrão em ambientes container e local
        candidate_paths.extend([
            Path("/app/credentials.json"),
            Path("/app/backups/credentials.json"),
            Path(__file__).resolve().parents[3] / "backups" / "credentials.json",
            Path(__file__).resolve().parents[3] / "credentials.json",
            Path(__file__).resolve().parents[2] / "credentials.json",  # backend/credentials.json
            Path("backups/credentials.json"),
            Path("credentials.json"),
        ])

        for path in candidate_paths:
            if path.is_file() and path.stat().st_size > 0:
                return path
        return None

    def resolve_backups_dir(self) -> Path:
        """Resolve o diretório local para armazenamento de backups."""
        # Se estiver em container (/app existe)
        if Path("/app").is_dir():
            backup_dir = Path("/app/backups")
        else:
            backup_dir = Path(__file__).resolve().parents[3] / self.BACKUPS_DIR
        
        backup_dir.mkdir(parents=True, exist_ok=True)
        return backup_dir

settings = Settings()
