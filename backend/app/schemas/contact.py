from pydantic import BaseModel, Field, ConfigDict

class ContactBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nome completo ou razão social do contato")
    email: str | None = Field(default=None, max_length=150, description="E-mail de contato")
    phone: str | None = Field(default=None, max_length=30, description="Telefone ou celular do contato")
    notes: str | None = Field(default=None, description="Observações complementares sobre o contato")
    is_active: bool = Field(default=True, description="Status de ativação do contato")

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    notes: str | None = None
    is_active: bool | None = None

class ContactResponse(ContactBase):
    id: str
    user_id: str
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)

class PlannedPaymentItem(BaseModel):
    id: str
    expense_id: str
    description: str
    installment_number: int
    installments_count: int
    amount_cents: int
    due_date: str
    status: str
    category_name: str | None = None
    category_color: str | None = None
    item_name: str | None = None
    payment_method_name: str | None = None

    model_config = ConfigDict(from_attributes=True)

class ContactSummaryResponse(BaseModel):
    contact: ContactResponse
    total_expenses_cents: int
    total_paid_cents: int
    total_pending_cents: int
    expenses_count: int
    pending_payments_count: int
    planned_payments: list[PlannedPaymentItem]

    model_config = ConfigDict(from_attributes=True)
