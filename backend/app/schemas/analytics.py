from pydantic import BaseModel, ConfigDict, Field


class NetWorthSummary(BaseModel):
    """Resumo patrimonial atual e divisão entre ativos e passivos."""
    total_net_worth_cents: int
    total_assets_cents: int
    total_liabilities_cents: int
    currency_code: str = "BRL"


class NetWorthPoint(BaseModel):
    """Ponto temporal de evolução do patrimônio líquido."""
    date: str
    net_worth_cents: int
    assets_cents: int
    liabilities_cents: int


class CashFlowMonthly(BaseModel):
    """Fluxo de caixa mensal realizado: receitas, despesas e poupança líquida."""
    period: str  # YYYY-MM
    month_name: str
    income_cents: int
    expense_cents: int
    net_savings_cents: int
    savings_rate_percent: float


class EssentialityBreakdown(BaseModel):
    """Distribuição de gastos pela cardinalidade/essencialidade nativa."""
    cardinality: str  # OBRIGATORIO, NECESSARIO, DESEJO, NENHUM
    label: str
    total_cents: int
    percentage: float
    color: str


class CategoryBreakdown(BaseModel):
    """Detalhamento de gastos por categoria principal."""
    category_id: str
    name: str
    group_name: str | None = None
    color: str
    icon: str
    cardinality: str
    total_cents: int
    percentage: float
    records_count: int


class LabelBreakdown(BaseModel):
    """Detalhamento transversal por etiquetas (tags)."""
    label_id: str
    name: str
    color: str
    total_cents: int
    records_count: int


class ReconciliationMetrics(BaseModel):
    """Índices de integridade e conciliação bancária."""
    total_records: int
    reconciled_count: int
    cleared_count: int
    uncleared_count: int
    void_count: int
    reconciled_percent: float


class HistoricalAnalyticsResponse(BaseModel):
    """Resposta consolidada para a análise financeira passada."""
    net_worth: NetWorthSummary
    net_worth_history: list[NetWorthPoint]
    monthly_cash_flow: list[CashFlowMonthly]
    by_essentiality: list[EssentialityBreakdown]
    top_categories: list[CategoryBreakdown]
    top_labels: list[LabelBreakdown]
    reconciliation: ReconciliationMetrics


# -------------------------------------------------------------------------
# Análise Futura / Preditiva
# -------------------------------------------------------------------------

class DailyBalanceProjection(BaseModel):
    """Simulação diária de saldo futuro e risco de liquidez."""
    date: str  # YYYY-MM-DD
    weekday: str
    day_inflow_cents: int
    day_outflow_cents: int
    projected_balance_cents: int
    is_negative: bool
    scheduled_items_count: int


class UpcomingScheduledItem(BaseModel):
    """Compromisso ou pagamento futuro programado."""
    id: str
    name: str
    amount_cents: int
    record_type: str  # RECEITA ou DESPESA
    due_date: str  # YYYY-MM-DD
    account_name: str
    category_name: str
    category_color: str
    recurrence_rule: str
    reminder: str


class GoalProjection(BaseModel):
    """Projeção de prazo e probabilidade de cumprimento de metas de economia."""
    goal_id: str
    name: str
    target_amount_cents: int
    current_amount_cents: int
    progress_percent: float
    desired_date: str | None = None
    estimated_completion_date: str | None = None
    is_on_track: bool
    monthly_savings_needed_cents: int
    state: str


class BudgetForecast(BaseModel):
    """Previsão e burn-rate diário para orçamentos ativos."""
    budget_id: str
    name: str
    limit_cents: int
    spent_so_far_cents: int
    projected_end_of_period_cents: int
    is_exceeded_projected: bool
    burn_rate_daily_cents: int
    remaining_cents: int
    days_remaining: int


class LiquidityAlert(BaseModel):
    """Alerta preventivo de risco financeiro ou saldo negativo futuro."""
    severity: str  # critical, warning, info
    title: str
    description: str
    date_expected: str
    projected_deficit_cents: int


class FutureAnalyticsResponse(BaseModel):
    """Resposta consolidada para o motor analítico preditivo."""
    horizon_days: int
    current_liquid_balance_cents: int
    projected_lowest_balance_cents: int
    projected_lowest_date: str | None = None
    daily_projections: list[DailyBalanceProjection]
    upcoming_scheduled: list[UpcomingScheduledItem]
    goals_projections: list[GoalProjection]
    budgets_forecast: list[BudgetForecast]
    liquidity_alerts: list[LiquidityAlert]


# -------------------------------------------------------------------------
# Visão Geral Unificada (Dashboard)
# -------------------------------------------------------------------------

class FinancialOverviewResponse(BaseModel):
    """KPIs macro para exibição imediata na tela de Início/Dashboard."""
    current_net_worth_cents: int
    current_month_income_cents: int
    current_month_expense_cents: int
    current_month_balance_cents: int
    savings_rate_percent: float
    projected_30d_balance_cents: int
    total_accounts_count: int
    active_standing_orders_count: int
    active_goals_count: int
    liquidity_risk_detected: bool
    last_sync_at: str | None = None
