from pydantic import BaseModel, Field

class CalendarPaymentItem(BaseModel):
    payment_id: str
    expense_id: str
    description: str
    installment_text: str
    amount_cents: int
    due_date: str
    status: str
    paid_at: str | None = None
    is_recurring: bool = False
    is_overdue: bool = False
    category_name: str = "Geral"
    category_color: str = "#6366f1"
    category_icon: str = "Tag"
    contact_name: str | None = None

class CalendarDay(BaseModel):
    date: str = Field(..., description="Data em formato YYYY-MM-DD")
    day: int = Field(..., description="Dia do mês")
    weekday: int = Field(..., description="Dia da semana (0=Segunda ... 6=Domingo)")
    weekday_name: str = Field(..., description="Nome do dia da semana (Dom, Seg, etc.)")
    is_current_month: bool = True
    is_today: bool = False
    total_cents: int = 0
    paid_cents: int = 0
    pending_cents: int = 0
    overdue_cents: int = 0
    has_overdue: bool = False
    payments: list[CalendarPaymentItem] = []

class CalendarMonthResponse(BaseModel):
    month: str = Field(..., description="Mês de competência (YYYY-MM)")
    year: int
    month_num: int
    month_name: str
    total_cents: int = 0
    paid_cents: int = 0
    pending_cents: int = 0
    overdue_cents: int = 0
    peak_day: str | None = None
    peak_day_amount_cents: int = 0
    days: list[CalendarDay] = []
