from pydantic import BaseModel, ConfigDict


class WalletRecordResponse(BaseModel):
    """Schema de resposta para transações financeiras (records)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    account_id: str
    account_name: str
    category_id: str | None = None
    category_name: str | None = None
    category_color: str | None = None
    category_icon: str | None = None
    cardinality: str = "NENHUM"
    record_type: str  # RECEITA, DESPESA, TRANSFERENCIA
    amount_cents: int
    currency_code: str
    converted_amount_cents: int
    record_date: str
    record_state: str  # reconciled, cleared, uncleared, void, waitForAssign
    counter_party: str | None = None
    note: str | None = None
    source: str
    is_transfer: bool
    transfer_id: str | None = None
    labels: list[str] = []


class PaginatedRecordsResponse(BaseModel):
    """Envelope paginado de transações."""
    items: list[WalletRecordResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
