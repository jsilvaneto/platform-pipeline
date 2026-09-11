from pydantic import BaseModel, Field

class DatabaseDiagnostics(BaseModel):
    engine: str = Field(default="PostgreSQL 16")
    driver: str = Field(default="asyncpg (SQLAlchemy 2.0 Async)")
    status: str = Field(default="connected")
    database_name: str
    server_host: str
    server_port: int
    latency_ms: float
    currency_storage_mode: str = Field(default="Inteiros em Centavos (amount_cents)")
    zero_residual_precision: bool = Field(default=True)
    size_bytes: int = Field(default=0, description="Tamanho do banco de dados em bytes")
    size_pretty: str = Field(default="0 MB", description="Tamanho formatado do banco de dados (ex: 8.5 MB)")


class VolumetricStats(BaseModel):
    total_categories: int
    total_items: int = 0
    total_contacts: int = 0
    total_payment_methods: int
    total_expenses: int
    total_payments: int
    total_users: int

class ApplicationDiagnostics(BaseModel):
    app_name: str
    version: str
    environment: str
    framework: str = Field(default="FastAPI + Python 3.10")
    auth_algorithm: str = Field(default="HS256 (JWT Bearer)")
    password_hasher: str = Field(default="bcrypt (12 rounds)")

class SystemDiagnosticsResponse(BaseModel):
    timestamp: str
    database: DatabaseDiagnostics
    volumetrics: VolumetricStats
    application: ApplicationDiagnostics


class VersionRelease(BaseModel):
    version: str = Field(description="Número semântico da versão (ex: 1.0.1)")
    release_date: str = Field(description="Data de lançamento no formato YYYY-MM-DD")
    is_current: bool = Field(default=False, description="Indica se é a versão em execução")
    highlights: str | None = Field(default=None, description="Resumo ou destaque principal da versão")
    improvements: list[str] = Field(default_factory=list, description="Lista de novidades e melhorias")
    fixes: list[str] = Field(default_factory=list, description="Lista de correções e ajustes")


class SystemVersionResponse(BaseModel):
    current_version: str = Field(description="Versão ativa do sistema")
    app_name: str = Field(description="Nome da aplicação")
    environment: str = Field(description="Ambiente de execução (development/production)")
    release_date: str | None = Field(default=None, description="Data de lançamento da versão atual")
    releases: list[VersionRelease] = Field(default_factory=list, description="Histórico de versões do changelog")

