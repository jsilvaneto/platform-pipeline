from typing import Literal
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.category import CategoryResponse
from app.schemas.item import ItemResponse
from app.schemas.contact import ContactResponse
from app.schemas.payment_method import PaymentMethodResponse
from app.schemas.payment import PaymentResponse
from app.schemas.attachment import AttachmentResponse

ExpenseStatus = Literal["PENDENTE", "CONCLUIDO", "CANCELADO"]
EssentialityType = Literal["OBRIGATORIO", "NECESSARIO", "DESEJO", "NENHUM"]

class ExpenseBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=200, description="Descrição da despesa pessoal")
    total_amount_cents: int = Field(..., gt=0, description="Valor total da despesa estritamente em centavos")
    issue_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Data da realização da despesa (YYYY-MM-DD)")
    due_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Data de vencimento principal (YYYY-MM-DD)")
    category_id: str | None = Field(default=None, description="ID da categoria")
    contact_id: str | None = Field(default=None, description="ID do contato associado")
    payment_method_id: str | None = Field(default=None, description="ID da forma de pagamento")
    status: ExpenseStatus = Field(default="PENDENTE", description="Status da despesa")
    installments_count: int = Field(default=1, ge=1, le=120, description="Número total de parcelas")
    is_recurring: bool = Field(default=False, description="Indica se é despesa fixa recorrente")
    notes: str | None = Field(default=None, description="Observações complementares")

class ExpenseCreate(ExpenseBase):
    item_id: str = Field(..., min_length=1, description="ID do item padronizado obrigatório")
    contact_id: str = Field(..., min_length=1, description="ID do contato associado obrigatório")
    essentiality: EssentialityType | None = Field(default=None, description="Grau de essencialidade (herdado diretamente do item)")

class ExpenseUpdate(BaseModel):
    description: str | None = Field(default=None, min_length=1, max_length=200)
    total_amount_cents: int | None = Field(default=None, gt=0, description="Valor total da despesa em centavos")
    issue_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Data da despesa (YYYY-MM-DD)")
    due_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Data de vencimento (YYYY-MM-DD)")
    category_id: str | None = None
    item_id: str | None = None
    contact_id: str | None = None
    payment_method_id: str | None = None
    essentiality: EssentialityType | None = None
    status: ExpenseStatus | None = None
    is_recurring: bool | None = None
    notes: str | None = None

class ExpenseResponse(ExpenseBase):
    id: str
    user_id: str
    item_id: str | None = None
    contact_id: str | None = None
    essentiality: EssentialityType = "NECESSARIO"
    created_at: str
    updated_at: str
    category: CategoryResponse | None = None
    item: ItemResponse | None = None
    contact: ContactResponse | None = None
    payment_method: PaymentMethodResponse | None = None
    payments: list[PaymentResponse] = []
    attachments: list[AttachmentResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ExpenseFilter(BaseModel):
    month: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$", description="Mês de competência/vencimento (YYYY-MM)")
    status: ExpenseStatus | None = None
    category_id: str | None = None
    item_id: str | None = None
    contact_id: str | None = None
    payment_method_id: str | None = None
    essentiality: EssentialityType | None = None
    is_overdue: bool | None = Field(default=None, description="Filtra apenas despesas com pagamentos pendentes em atraso")
