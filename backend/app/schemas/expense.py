from typing import Literal
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.category import CategoryResponse
from app.schemas.item import ItemResponse
from app.schemas.payment_method import PaymentMethodResponse
from app.schemas.payment import PaymentResponse

ExpenseStatus = Literal["PENDENTE", "CONCLUIDO", "CANCELADO"]
EssentialityType = Literal["OBRIGATORIO", "NECESSARIO", "DESEJO", "NENHUM"]

class ExpenseBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=200, description="Descrição da despesa pessoal")
    total_amount_cents: int = Field(..., gt=0, description="Valor total da despesa estritamente em centavos")
    issue_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Data da realização da despesa (YYYY-MM-DD)")
    due_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Data de vencimento principal (YYYY-MM-DD)")
    category_id: str | None = Field(default=None, description="ID da categoria")
    item_id: str | None = Field(default=None, description="ID do item padronizado")
    payment_method_id: str | None = Field(default=None, description="ID da forma de pagamento")
    essentiality: EssentialityType = Field(default="NECESSARIO", description="Grau de essencialidade")
    status: ExpenseStatus = Field(default="PENDENTE", description="Status da despesa")
    installments_count: int = Field(default=1, ge=1, le=120, description="Número total de parcelas")
    is_recurring: bool = Field(default=False, description="Indica se é despesa fixa recorrente")
    notes: str | None = Field(default=None, description="Observações complementares")

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    description: str | None = Field(default=None, min_length=1, max_length=200)
    category_id: str | None = None
    item_id: str | None = None
    payment_method_id: str | None = None
    essentiality: EssentialityType | None = None
    status: ExpenseStatus | None = None
    is_recurring: bool | None = None
    notes: str | None = None

class ExpenseResponse(ExpenseBase):
    id: str
    user_id: str
    created_at: str
    updated_at: str
    category: CategoryResponse | None = None
    item: ItemResponse | None = None
    payment_method: PaymentMethodResponse | None = None
    payments: list[PaymentResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ExpenseFilter(BaseModel):
    month: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$", description="Mês de competência/vencimento (YYYY-MM)")
    status: ExpenseStatus | None = None
    category_id: str | None = None
    item_id: str | None = None
    payment_method_id: str | None = None
    essentiality: EssentialityType | None = None
