from pydantic import BaseModel, Field
from typing import List, Optional

class CategoryBreakdown(BaseModel):
    category_id: str
    category_name: str
    amount_cents: int
    percentage: float

class AccountBalanceSummary(BaseModel):
    account_id: str
    account_name: str
    account_type: str # CORRENTE, POUPANCA, INVESTIMENTO, CAIXA
    balance_cents: int

class MonthlyTrendItem(BaseModel):
    month: int
    year: int
    label: str # ex: "Mar/26"
    income_realized_cents: int
    expense_realized_cents: int
    net_realized_cents: int
    savings_rate: float

class NatureBreakdown(BaseModel):
    nature: str # OBRIGATORIO, NECESSARIO, DESEJO, NENHUM
    nature_label: str
    amount_cents: int
    percentage: float
    target_percentage: float
    status: str # NORMAL, ATENCAO, EXCEDIDO

class BudgetSummaryItem(BaseModel):
    budget_id: str
    category_id: str
    category_name: str
    limit_amount_cents: int
    spent_amount_cents: int
    percentage: float
    remaining_cents: int
    status: str # NORMAL, ATENCAO, ESTOURADO

class UpcomingTransactionItem(BaseModel):
    id: str
    description: str
    due_date: str
    amount_cents: int
    type: str # RECEITA, DESPESA, TRANSFERENCIA
    status: str # PENDENTE, CONCLUIDO
    category_name: Optional[str] = None
    account_name: Optional[str] = None
    contact_name: Optional[str] = None

class PaymentMethodDistribution(BaseModel):
    payment_method_id: Optional[str] = None
    name: str
    amount_cents: int
    percentage: float
    count: int

class GoalSummaryItem(BaseModel):
    id: str
    title: str
    target_amount_cents: int
    current_amount_cents: int
    percentage: float
    target_date: Optional[str] = None
    status: str

class DashboardSummaryResponse(BaseModel):
    profile: str
    month: int
    year: int
    
    # 1. Realizados (Liquidados no mês)
    income_realized_cents: int
    expense_realized_cents: int
    net_realized_cents: int
    savings_rate: float
    
    # 2. Pendentes (A vencer no mês)
    income_pending_cents: int
    expense_pending_cents: int
    net_pending_cents: int
    
    # 3. Projeção final consolidada
    projected_net_cents: int
    
    # 4. Alertas operacionais
    overdue_count: int
    overdue_amount_cents: int
    due_today_count: int
    due_today_amount_cents: int

    # 5. Posição Patrimonial & Saldos de Contas
    total_account_balance_cents: int
    total_credit_card_invoices_cents: int
    total_debts_remaining_cents: int
    net_worth_cents: int
    accounts_balances: List[AccountBalanceSummary] = []

    # 6. Histórico e Tendência (Últimos 6 Meses)
    historical_trend: List[MonthlyTrendItem] = []

    # 7. Diagnóstico 50-30-20 (Essencialidade)
    nature_breakdown: List[NatureBreakdown] = []

    # 8. Top Categorias de Despesas
    top_expense_categories: List[CategoryBreakdown] = []

    # 9. Monitoramento de Orçamentos (Budgets)
    budgets_summary: List[BudgetSummaryItem] = []

    # 10. Próximos 7 Dias (Timeline)
    upcoming_7_days: List[UpcomingTransactionItem] = []

    # 11. Distribuição por Meio de Pagamento
    payment_methods_distribution: List[PaymentMethodDistribution] = []

    # 12. Metas Ativas
    goals_summary: List[GoalSummaryItem] = []
