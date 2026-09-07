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

class VolumetricStats(BaseModel):
    total_categories: int
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
