from pydantic import BaseModel, ConfigDict


class WalletAccountResponse(BaseModel):
    """Schema de resposta para contas bancárias e carteiras sincronizadas."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    account_type: str
    currency_code: str
    initial_balance_cents: int
    current_balance_cents: int
    credit_balance_cents: int | None = None
    credit_limit_cents: int | None = None
    available_credit_cents: int | None = None
    balance_mode: str | None = None
    exclude_from_stats: bool
    color: str
    is_archived: bool
    created_at: str
    updated_at: str
