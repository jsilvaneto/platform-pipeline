from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional, List
from app.schemas.attachment import AttachmentResponse

ProfileType = Literal["PESSOAL", "EMPRESA"]
TransactionType = Literal["RECEITA", "DESPESA", "TRANSFERENCIA"]
TransactionStatus = Literal["PENDENTE", "CONCLUIDO", "CANCELADO"]
SyncStatus = Literal["PENDENTE", "SINCRONIZADO"]

class TransactionBase(BaseModel):
    type: TransactionType = Field(..., description="RECEITA, DESPESA ou TRANSFERENCIA")
    account_id: Optional[str] = Field(None, description="Conta bancária / carteira (Origem em transferências)")
    destination_account_id: Optional[str] = Field(None, description="Conta bancária / carteira de Destino em transferências")
    credit_card_id: Optional[str] = None
    category_id: Optional[str] = Field(None, description="ID da categoria (opcional para transferências)")
    item_id: Optional[str] = None
    contact_id: Optional[str] = None
    debt_id: Optional[str] = None
    payment_method_id: Optional[str] = None
    invoice_month: Optional[int] = None
    invoice_year: Optional[int] = None
    is_invoice_payment: int = 0
    description: str = Field(..., min_length=1, max_length=255)
    amount_cents: int = Field(..., gt=0, description="Valor em centavos")
    due_date: str = Field(..., description="Data prevista / vencimento (YYYY-MM-DD)")
    payment_date: Optional[str] = Field(None, description="Data de quitação real (YYYY-MM-DD)")
    status: TransactionStatus = Field(default="PENDENTE")
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    profile: ProfileType = Field(..., description="Perfil da transação")
    attachment_ids: Optional[List[str]] = Field(default=None, description="IDs dos anexos previamente carregados para vincular")

class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    account_id: Optional[str] = None
    destination_account_id: Optional[str] = None
    credit_card_id: Optional[str] = None
    category_id: Optional[str] = None
    item_id: Optional[str] = None
    contact_id: Optional[str] = None
    debt_id: Optional[str] = None
    payment_method_id: Optional[str] = None
    invoice_month: Optional[int] = None
    invoice_year: Optional[int] = None
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    amount_cents: Optional[int] = Field(None, gt=0)
    due_date: Optional[str] = None
    payment_date: Optional[str] = None
    status: Optional[TransactionStatus] = None
    notes: Optional[str] = None
    attachment_ids: Optional[List[str]] = Field(default=None, description="IDs dos novos comprovantes para vincular")

class TransactionResponse(TransactionBase):
    id: str
    profile: ProfileType
    schedule_id: Optional[str] = None
    installment_number: Optional[int] = None
    total_installments: Optional[int] = None
    sync_status: SyncStatus
    created_at: str
    updated_at: str
    attachments: List[AttachmentResponse] = Field(default_factory=list)
    attachments_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class TransactionBatchAction(BaseModel):
    transaction_ids: List[str] = Field(..., min_length=1, description="IDs das transações a processar")

class TransactionBatchComplete(BaseModel):
    transaction_ids: List[str] = Field(..., min_length=1)
    payment_date: Optional[str] = Field(None, description="Data de quitação (YYYY-MM-DD), padrão hoje")

class TransactionBatchUpdate(BaseModel):
    transaction_ids: List[str] = Field(..., min_length=1)
    category_id: Optional[str] = None
    account_id: Optional[str] = None
    payment_method_id: Optional[str] = None
    contact_id: Optional[str] = None
    due_date: Optional[str] = None
    payment_date: Optional[str] = None
    status: Optional[TransactionStatus] = None
    notes: Optional[str] = None

class TransactionBatchResponse(BaseModel):
    affected_count: int
    message: str

