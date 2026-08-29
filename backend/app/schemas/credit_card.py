from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict

class CreditCardBase(BaseModel):
    profile: Literal["PESSOAL", "EMPRESA"]
    name: str = Field(..., min_length=1, max_length=100, description="Nome identificador do cartão")
    limit_cents: int = Field(..., ge=0, description="Limite total do cartão em centavos inteiros")
    closing_day: int = Field(..., ge=1, le=31, description="Dia do fechamento (melhor dia de compra)")
    due_day: int = Field(..., ge=1, le=31, description="Dia do vencimento da fatura")
    color: str = Field(default="emerald", max_length=30, description="Cor de destaque visual do cartão")
    brand: Optional[str] = Field(default="MASTERCARD", max_length=30, description="Bandeira do cartão")
    account_id: Optional[str] = Field(default=None, description="ID da conta bancária padrão de pagamento")

class CreditCardCreate(CreditCardBase):
    pass

class CreditCardUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    limit_cents: Optional[int] = Field(default=None, ge=0)
    closing_day: Optional[int] = Field(default=None, ge=1, le=31)
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    color: Optional[str] = Field(default=None, max_length=30)
    brand: Optional[str] = Field(default=None, max_length=30)
    account_id: Optional[str] = None

class CreditCardResponse(BaseModel):
    id: str
    profile: Literal["PESSOAL", "EMPRESA"]
    name: str
    limit_cents: int
    used_limit_cents: int = 0
    available_limit_cents: int = 0
    current_invoice_cents: int = 0
    closing_day: int
    due_day: int
    color: str = "emerald"
    brand: Optional[str] = None
    account_id: Optional[str] = None
    account_name: Optional[str] = None
    created_at: str

    model_config = ConfigDict(from_attributes=True)

from app.schemas.attachment import AttachmentResponse

class CreditCardInvoiceCategoryBreakdown(BaseModel):
    category_id: str
    category_name: str
    amount_cents: int
    percentage: float

class CreditCardInvoiceItem(BaseModel):
    id: str
    description: str
    amount_cents: int
    category_id: str
    category_name: str
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    due_date: str # YYYY-MM-DD (vencimento da fatura)
    payment_date: Optional[str] = None # Data em que a fatura/lançamento foi liquidado
    created_at: str # Data original do registro / compra
    installment_number: Optional[int] = None
    total_installments: Optional[int] = None
    status: Literal["PENDENTE", "CONCLUIDO", "CANCELADO"]
    notes: Optional[str] = None
    attachments: List[AttachmentResponse] = Field(default_factory=list)
    attachments_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class CreditCardInvoiceSummary(BaseModel):
    card_id: str
    card_name: str
    month: int
    year: int
    period_start: str # YYYY-MM-DD
    period_end: str # YYYY-MM-DD (closing date)
    due_date: str # YYYY-MM-DD
    status: Literal["ABERTA", "FECHADA", "PAGA"]
    total_cents: int
    paid_cents: int
    remaining_cents: int
    items_count: int

class CreditCardInvoiceDetail(CreditCardInvoiceSummary):
    items: List[CreditCardInvoiceItem] = []
    category_breakdown: List[CreditCardInvoiceCategoryBreakdown] = []

class CreditCardInvoiceSettleRequest(BaseModel):
    account_id: str = Field(..., description="ID da conta bancária de onde sairá o pagamento")
    payment_date: str = Field(..., description="Data do pagamento (YYYY-MM-DD)")
    payment_method_id: Optional[str] = Field(default=None, description="Forma de pagamento utilizada (ex: Débito Automático, Boleto, Pix)")
    category_id: Optional[str] = Field(default=None, description="Categoria do débito bancário (opcional)")
    amount_cents: Optional[int] = Field(default=None, ge=1, description="Valor do pagamento (se nulo, usa o total restante da fatura)")
    notes: Optional[str] = Field(default=None, description="Observações do pagamento")

class CreditCardInvoiceSettleResponse(BaseModel):
    card_id: str
    month: int
    year: int
    total_settled_cents: int
    settled_items_count: int
    bank_transaction_id: str
    message: str
