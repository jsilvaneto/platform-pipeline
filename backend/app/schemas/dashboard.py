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

class DashboardMetrics(BaseModel):
    period: str = Field(..., description="Mês de referência (YYYY-MM)")
    total_expenses_cents: int = Field(default=0, description="Total geral de despesas do mês em centavos")
    total_paid_cents: int = Field(default=0, description="Total já liquidado/pago no mês em centavos")
    total_pending_cents: int = Field(default=0, description="Total a pagar no mês em centavos")
    total_overdue_cents: int = Field(default=0, description="Total vencido e não pago em centavos")
    by_category: list[CategorySpending] = []
    by_essentiality: list[EssentialitySpending] = []
    upcoming_payments: list[UpcomingPayment] = []
