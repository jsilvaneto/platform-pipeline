from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from app.schemas.category import CategoryResponse
from app.schemas.account import AccountResponse
from app.schemas.payment_method import PaymentMethodResponse
from app.schemas.credit_card import CreditCardResponse
from app.schemas.item import ItemResponse
from app.schemas.contact import ContactResponse
from app.schemas.debt import DebtResponse
from app.schemas.budget import BudgetResponse
from app.schemas.goal import GoalResponse
from app.schemas.schedule import ScheduleResponse
from app.schemas.transaction import TransactionResponse

ProfileType = Literal["PESSOAL", "EMPRESA"]
TransactionType = Literal["RECEITA", "DESPESA", "TRANSFERENCIA"]
TransactionStatus = Literal["PENDENTE", "CONCLUIDO", "CANCELADO"]

class MobileTransactionSyncItem(BaseModel):
    id: Optional[str] = Field(None, description="UUID da transação gerado no cliente ou no servidor")
    type: TransactionType = "DESPESA"
    description: str
    amount_cents: int
    due_date: str
    payment_date: Optional[str] = None
    status: TransactionStatus = "PENDENTE"
    category_id: Optional[str] = None
    account_id: Optional[str] = None
    destination_account_id: Optional[str] = None
    credit_card_id: Optional[str] = None
    payment_method_id: Optional[str] = None
    contact_id: Optional[str] = None
    item_id: Optional[str] = None
    debt_id: Optional[str] = None
    schedule_id: Optional[str] = None
    notes: Optional[str] = None
    installment_number: Optional[int] = None
    total_installments: Optional[int] = None
    invoice_month: Optional[int] = None
    invoice_year: Optional[int] = None
    is_invoice_payment: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class MobileSyncPushRequest(BaseModel):
    profile: ProfileType
    transactions: List[MobileTransactionSyncItem] = Field(default_factory=list, description="Lista de lançamentos a serem criados ou sincronizados")

class MobileSyncPushResponse(BaseModel):
    success: bool
    server_timestamp: str
    inserted_count: int = 0
    updated_count: int = 0
    synced_ids: List[str] = Field(default_factory=list, description="Lista de IDs das transações persistidas com sucesso")
    errors: List[str] = Field(default_factory=list, description="Lista de erros encontrados durante a sincronização")

class MobileSyncPullResponse(BaseModel):
    server_timestamp: str
    profile: Optional[ProfileType] = None
    categories: List[CategoryResponse] = Field(default_factory=list)
    accounts: List[AccountResponse] = Field(default_factory=list)
    payment_methods: List[PaymentMethodResponse] = Field(default_factory=list)
    credit_cards: List[CreditCardResponse] = Field(default_factory=list)
    items: List[ItemResponse] = Field(default_factory=list)
    contacts: List[ContactResponse] = Field(default_factory=list)
    debts: List[DebtResponse] = Field(default_factory=list)
    budgets: List[BudgetResponse] = Field(default_factory=list)
    goals: List[GoalResponse] = Field(default_factory=list)
    schedules: List[ScheduleResponse] = Field(default_factory=list)
    transactions: List[TransactionResponse] = Field(default_factory=list)

class SyncStatusResponse(BaseModel):
    api_online: bool = True
    server_time: str
    database: str = "SQLite WAL"
    total_transactions: int = 0
    total_attachments: int = 0
    storage_healthy: bool = True
    last_sync_at: Optional[str] = None
    last_sync_status: Optional[str] = None
    last_action: Optional[str] = None

class SyncLogResponse(BaseModel):
    id: str
    action: str
    status: str
    items_imported: int
    items_exported: int
    message: str
    details: Optional[str] = None
    created_at: str
