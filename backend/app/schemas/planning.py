from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal

# ==========================================
# 1. FLUXO DE CAIXA PROJETADO (12 a 24 MESES)
# ==========================================

class CashflowProjectionItem(BaseModel):
    month: str = Field(..., description="Mês de competência formato YYYY-MM")
    month_name: str = Field(..., description="Nome amigável ex: Set/26")
    starting_balance_cents: int = Field(..., description="Saldo de abertura do mês em centavos")
    projected_income_cents: int = Field(..., description="Receitas totais previstas no mês")
    projected_expense_cents: int = Field(..., description="Despesas totais previstas no mês")
    expense_mandatory_cents: int = Field(0, description="Despesas OBRIGATÓRIAS")
    expense_necessary_cents: int = Field(0, description="Despesas NECESSÁRIAS")
    expense_discretionary_cents: int = Field(0, description="Despesas DESEJOS / DISCRICIONÁRIAS")
    expense_other_cents: int = Field(0, description="Despesas sem classificação ou gerais")
    credit_card_invoices_cents: int = Field(0, description="Faturas de cartão de crédito no mês")
    net_balance_cents: int = Field(..., description="Resultado do mês (Receitas - Despesas)")
    accumulated_balance_cents: int = Field(..., description="Saldo final acumulado ao término do mês")
    is_negative_alert: bool = Field(False, description="True se o saldo acumulado for negativo")

    model_config = ConfigDict(from_attributes=True)


class CashflowProjectionResponse(BaseModel):
    profile: Literal["PESSOAL", "EMPRESA"]
    horizon_months: int
    current_balance_cents: int
    lowest_balance_cents: int
    negative_months_count: int
    total_projected_income_cents: int
    total_projected_expense_cents: int
    projected_net_cents: int
    items: List[CashflowProjectionItem]

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 2. SIMULADOR DE CENÁRIOS ("WHAT-IF")
# ==========================================

class ScenarioSimulationRequest(BaseModel):
    profile: Literal["PESSOAL", "EMPRESA"]
    months: int = Field(12, ge=1, le=24)
    income_variation_percent: float = Field(0.0, description="Variação % nas receitas (ex: +10% ou -15%)")
    discretionary_cut_percent: float = Field(0.0, description="Corte % em gastos de Desejo (0 a 100)")
    necessary_cut_percent: float = Field(0.0, description="Corte % em gastos Necessários (0 a 100)")
    mandatory_cut_percent: float = Field(0.0, description="Corte % em gastos Obrigatórios (0 a 100)")
    additional_monthly_expense_cents: int = Field(0, description="Nova despesa fixa mensal simulada em centavos")
    additional_monthly_income_cents: int = Field(0, description="Nova receita fixa mensal simulada em centavos")


class ScenarioSimulationItem(BaseModel):
    month: str
    month_name: str
    base_accumulated_cents: int
    simulated_accumulated_cents: int
    delta_cents: int

    model_config = ConfigDict(from_attributes=True)


class ScenarioSimulationResponse(BaseModel):
    profile: Literal["PESSOAL", "EMPRESA"]
    months: int
    base_final_balance_cents: int
    simulated_final_balance_cents: int
    total_delta_cents: int
    total_savings_generated_cents: int
    items: List[ScenarioSimulationItem]

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 3. RUNWAY, FÔLEGO & RESERVA DE EMERGÊNCIA
# ==========================================

class RunwayResponse(BaseModel):
    profile: Literal["PESSOAL", "EMPRESA"]
    current_liquid_balance_cents: int = Field(..., description="Saldo consolidado em contas")
    essential_monthly_cost_cents: int = Field(..., description="Custo mensal essencial médio (Obrigatório + Necessário)")
    discretionary_monthly_cost_cents: int = Field(..., description="Custo mensal discricionário médio (Desejos)")
    total_monthly_cost_cents: int = Field(..., description="Gasto médio mensal total")
    runway_months: float = Field(..., description="Meses de fôlego financeiro (saldo / custo essencial)")
    health_status: Literal["CRITICO", "MODERADO", "BOM", "EXCELENTE"]
    recommended_reserve_cents: int = Field(..., description="Meta recomendada de reserva (ex: 6 meses PF ou 3 meses PJ)")
    reserve_gap_cents: int = Field(..., description="Valor restante para atingir a reserva ideal")
    fire_number_cents: Optional[int] = Field(None, description="Patrimônio para Independência Financeira (25x Custo Anual)")
    burn_rate_cents: Optional[int] = Field(None, description="Taxa de queima mensal (para EMPRESA)")

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 4. METAS COM PROJEÇÃO TEMPORAL
# ==========================================

class GoalProjectionItem(BaseModel):
    id: str
    title: str
    target_amount_cents: int
    current_amount_cents: int
    remaining_amount_cents: int
    target_date: Optional[str] = None
    status: str
    progress_percentage: float
    monthly_contribution_avg_cents: int
    estimated_completion_date: Optional[str] = None
    estimated_months_to_complete: Optional[int] = None
    required_monthly_deposit_cents: Optional[int] = None
    compound_interest_gain_cents: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class GoalProjectionResponse(BaseModel):
    profile: Literal["PESSOAL", "EMPRESA"]
    total_target_cents: int
    total_current_cents: int
    total_remaining_cents: int
    goals: List[GoalProjectionItem]

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 5. MAPA DE COMPROMETIMENTO DE RENDA
# ==========================================

class CommittedIncomeItem(BaseModel):
    month: str
    month_name: str
    projected_income_cents: int
    schedules_amount_cents: int
    debts_amount_cents: int
    credit_card_amount_cents: int
    total_committed_cents: int
    committed_percentage: float
    free_income_cents: int
    free_income_percentage: float

    model_config = ConfigDict(from_attributes=True)


class CommittedIncomeResponse(BaseModel):
    profile: Literal["PESSOAL", "EMPRESA"]
    average_committed_percentage: float
    items: List[CommittedIncomeItem]

    model_config = ConfigDict(from_attributes=True)
