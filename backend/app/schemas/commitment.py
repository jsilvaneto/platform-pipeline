from pydantic import BaseModel, ConfigDict
from app.schemas.payment import PaymentResponse

class NextPayoffInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    expense_id: str
    description: str
    item_name: str | None = None
    remaining_installments: int
    total_installments: int
    payoff_due_date: str
    remaining_cents: int

class MonthlyCommitmentProjection(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    month: str       # YYYY-MM
    month_name: str  # Set/26
    recurring_cents: int
    installments_cents: int
    total_cents: int

class RecurringCommitmentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    expense_id: str
    description: str
    item_id: str | None = None
    item_name: str | None = None
    category_id: str | None = None
    category_name: str | None = None
    category_color: str | None = None
    contact_name: str | None = None
    payment_method_name: str | None = None
    amount_cents: int
    due_day: int
    status: str
    next_due_date: str | None = None
    next_payment_id: str | None = None
    next_payment_status: str | None = None

class InstallmentCommitmentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    expense_id: str
    description: str
    item_name: str | None = None
    category_name: str | None = None
    category_color: str | None = None
    contact_name: str | None = None
    total_amount_cents: int
    paid_amount_cents: int
    remaining_amount_cents: int
    installment_amount_cents: int
    total_installments: int
    paid_installments: int
    remaining_installments: int
    progress_percentage: int
    next_due_date: str | None = None
    last_due_date: str | None = None
    payments: list[PaymentResponse] = []

class CommitmentsSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    fixed_monthly_total_cents: int
    active_recurring_count: int
    total_installments_remaining_cents: int
    active_installments_count: int
    next_payoff: NextPayoffInfo | None = None
    recurring_commitments: list[RecurringCommitmentItem]
    installment_commitments: list[InstallmentCommitmentItem]
    monthly_projection: list[MonthlyCommitmentProjection]
