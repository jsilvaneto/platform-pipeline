from pydantic import BaseModel, Field

class CategorySpending(BaseModel):
    category_id: str | None = None
    category_name: str
    color: str
    icon: str
    total_cents: int
    percentage: float

class EssentialitySpending(BaseModel):
    essentiality: str
    total_cents: int
    percentage: float

class UpcomingPayment(BaseModel):
    payment_id: str
    expense_id: str
    description: str
    installment_text: str
    amount_cents: int
    due_date: str
    category_name: str
    color: str
    status: str

class MonthlySpending(BaseModel):
    month: int = Field(..., ge=1, le=12, description="Número do mês (1-12)")
    month_name: str = Field(..., description="Nome abreviado do mês (Jan, Fev, etc.)")
    total_cents: int = Field(default=0, description="Total de despesas do mês em centavos")
    paid_cents: int = Field(default=0, description="Total pago do mês em centavos")
    pending_cents: int = Field(default=0, description="Total a pagar do mês em centavos")

class ItemSpending(BaseModel):
    item_id: str | None = None
    item_name: str
    category_name: str
    nature: str
    total_cents: int
    percentage: float

class DashboardMetrics(BaseModel):
    period: str = Field(..., description="Período de referência (Ano ou Ano-Mês)")
    year: int = Field(..., description="Ano de referência (ex: 2026)")
    total_expenses_cents: int = Field(default=0, description="Total geral de despesas do período em centavos")
    total_paid_cents: int = Field(default=0, description="Total já liquidado/pago no período em centavos")
    total_pending_cents: int = Field(default=0, description="Total a pagar no período em centavos")
    total_overdue_cents: int = Field(default=0, description="Total vencido e não pago em centavos")
    monthly_breakdown: list[MonthlySpending] = []
    by_category: list[CategorySpending] = []
    by_item: list[ItemSpending] = []
    by_essentiality: list[EssentialitySpending] = []
    upcoming_payments: list[UpcomingPayment] = []


