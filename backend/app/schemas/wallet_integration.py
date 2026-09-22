from pydantic import BaseModel, ConfigDict, Field


class WalletIntegrationCreate(BaseModel):
    """Schema para cadastro ou substituição do token pessoal da REST API do Wallet."""
    api_key: str = Field(..., min_length=10, max_length=500, description="Token Bearer gerado no Wallet (Settings -> REST API)")
    api_base_url: str = Field(default="https://rest.budgetbakers.com/wallet", max_length=200, description="URL Base oficial da REST API")


class WalletIntegrationUpdate(BaseModel):
    """Schema para atualização parcial de configurações."""
    api_key: str | None = Field(default=None, min_length=10, max_length=500)
    api_base_url: str | None = Field(default=None, max_length=200)
    is_active: bool | None = None


class WalletIntegrationResponse(BaseModel):
    """Schema seguro de resposta: NUNCA expõe a chave real em texto claro."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    api_base_url: str
    token_masked: str | None = None
    is_configured: bool = False
    is_active: bool = True
    last_sync_at: str | None = None
    last_sync_rev: int | None = None
    last_sync_status: str = "PENDING"
    last_error_message: str | None = None
    rate_limit_remaining: int | None = 300
    rate_limit_limit: int | None = 300
    rate_limit_reset_at: str | None = None
    created_at: str
    updated_at: str


class WalletIntegrationTestRequest(BaseModel):
    """Permite testar uma chave digitada no modal ou a chave já salva."""
    api_key: str | None = Field(default=None, max_length=500)


class WalletIntegrationTestResponse(BaseModel):
    """Diagnóstico e validação imediata da conexão com a REST API da BudgetBakers."""
    success: bool
    message: str
    latency_ms: int
    status_code: int
    api_usage: dict[str, str | int | float | bool | None] | None = None
