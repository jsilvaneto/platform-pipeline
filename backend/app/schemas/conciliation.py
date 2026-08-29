from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional, List

ConciliationMatchStatus = Literal["NOVO", "DUPLICADO", "POSSIVEL_CONCILIACAO"]

class ConciliationParsedItem(BaseModel):
    id: str = Field(..., description="ID temporário da linha de conciliação")
    fitid: Optional[str] = None
    date: str = Field(..., description="Data da transação (YYYY-MM-DD)")
    description: str
    original_description: str
    amount_cents: int
    type: Literal["RECEITA", "DESPESA"]
    match_status: ConciliationMatchStatus
    matched_transaction_id: Optional[str] = None
    matched_transaction_description: Optional[str] = None
    suggested_category_id: Optional[str] = None
    suggested_category_name: Optional[str] = None
    suggested_contact_id: Optional[str] = None
    suggested_contact_name: Optional[str] = None
    suggested_payment_method_id: Optional[str] = None
    selected: bool = True

class ConciliationParseResponse(BaseModel):
    account_id: str
    account_name: Optional[str] = None
    total_parsed: int
    total_income_cents: int
    total_expense_cents: int
    new_count: int
    duplicate_count: int
    items: List[ConciliationParsedItem]

class ConciliationImportItem(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD")
    description: str = Field(..., min_length=1, max_length=255)
    amount_cents: int = Field(..., gt=0)
    type: Literal["RECEITA", "DESPESA"]
    category_id: Optional[str] = None
    contact_id: Optional[str] = None
    payment_method_id: Optional[str] = None
    notes: Optional[str] = None
    status: Literal["CONCLUIDO", "PENDENTE"] = "CONCLUIDO"

class ConciliationImportRequest(BaseModel):
    account_id: str
    profile: Literal["EMPRESA"] = "EMPRESA"
    items: List[ConciliationImportItem]

class ConciliationImportResponse(BaseModel):
    imported_count: int
    total_amount_cents: int
    created_transaction_ids: List[str]
