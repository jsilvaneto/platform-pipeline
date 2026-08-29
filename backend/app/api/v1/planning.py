from datetime import datetime, timezone, timedelta
from math import ceil
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    Transaction, Category, Account, Schedule, Debt, Goal, CreditCard, User
)
from app.schemas.planning import (
    CashflowProjectionResponse, CashflowProjectionItem,
    ScenarioSimulationRequest, ScenarioSimulationResponse, ScenarioSimulationItem,
    RunwayResponse, GoalProjectionResponse, GoalProjectionItem,
    CommittedIncomeResponse, CommittedIncomeItem
)
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/planning", tags=["Planejamento & Futuro"])

MONTH_SHORT_NAMES = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
]

def format_month_label(year: int, month: int) -> str:
    short_year = str(year)[2:]
    return f"{MONTH_SHORT_NAMES[month - 1]}/{short_year}"

def get_future_months(start_year: int, start_month: int, count: int) -> List[tuple[int, int, str, str]]:
    """Gera tuplas de (ano, mes, YYYY-MM, 'Mês/AA') para 'count' meses a partir de start_year/start_month."""
    months = []
    curr_y = start_year
    curr_m = start_month
    for _ in range(count):
        month_str = f"{curr_y:04d}-{curr_m:02d}"
        label = format_month_label(curr_y, curr_m)
        months.append((curr_y, curr_m, month_str, label))
        curr_m += 1
        if curr_m > 12:
            curr_m = 1
            curr_y += 1
    return months


async def get_current_profile_balance(profile: str, db: AsyncSession) -> int:
    """Calcula o saldo real consolidado em contas para o perfil informado."""
    accounts_res = await db.execute(select(Account.id).where(Account.profile == profile))
    account_ids = [row[0] for row in accounts_res.all()]
    if not account_ids:
        return 0

    # 1. Receitas CONCLUIDO
    inc_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
        Transaction.profile == profile,
        Transaction.type == "RECEITA",
        Transaction.status == "CONCLUIDO",
        Transaction.account_id.in_(account_ids)
    )
    inc_total = (await db.execute(inc_query)).scalar() or 0

    # 2. Despesas CONCLUIDO
    exp_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
        Transaction.profile == profile,
        Transaction.type == "DESPESA",
        Transaction.status == "CONCLUIDO",
        Transaction.account_id.in_(account_ids)
    )
    exp_total = (await db.execute(exp_query)).scalar() or 0

    # 3. Transferências Entradas
    trans_in_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
        Transaction.profile == profile,
        Transaction.type == "TRANSFERENCIA",
        Transaction.status == "CONCLUIDO",
        Transaction.destination_account_id.in_(account_ids)
    )
    trans_in = (await db.execute(trans_in_query)).scalar() or 0

    # 4. Transferências Saídas
    trans_out_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
        Transaction.profile == profile,
        Transaction.type == "TRANSFERENCIA",
        Transaction.status == "CONCLUIDO",
        Transaction.account_id.in_(account_ids)
    )
    trans_out = (await db.execute(trans_out_query)).scalar() or 0

    return (inc_total + trans_in) - (exp_total + trans_out)


# ==========================================
# 1. PROJEÇÃO DE FLUXO DE CAIXA (12 A 24 MESES)
# ==========================================

@router.get("/projection", response_model=CashflowProjectionResponse)
async def get_cashflow_projection(
    profile: str = Query(..., description="PESSOAL ou EMPRESA"),
    months: int = Query(12, ge=1, le=24, description="Horizonte de projeção em meses"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    today = datetime.now(timezone.utc)
    curr_y = today.year
    curr_m = today.month
    
    # 1. Saldo Inicial
    initial_balance = await get_current_profile_balance(profile, db)
    
    # 2. Gera os meses do horizonte
    future_months = get_future_months(curr_y, curr_m, months)
    
    # 3. Carrega todas as transações futuras / pendentes
    min_month_str = future_months[0][2]
    max_month_str = future_months[-1][2]
    
    trans_query = select(Transaction).options(
        selectinload(Transaction.category)
    ).where(
        Transaction.profile == profile,
        Transaction.status == "PENDENTE",
        or_(
            and_(Transaction.due_date >= f"{min_month_str}-01", Transaction.due_date <= f"{max_month_str}-31"),
            and_(Transaction.invoice_year.isnot(None), Transaction.invoice_month.isnot(None))
        )
    )
    trans_res = await db.execute(trans_query)
    transactions = trans_res.scalars().all()
    
    # 4. Carrega contratos recorrentes contínuos para projetar meses que ainda não têm transação gerada
    schedules_query = select(Schedule).options(
        selectinload(Schedule.category)
    ).where(
        Schedule.profile == profile,
        Schedule.status == "ATIVO",
        Schedule.schedule_type == "RECORRENTE_CONTINUA"
    )
    schedules_res = await db.execute(schedules_query)
    active_schedules = schedules_res.scalars().all()
    
    projection_items: List[CashflowProjectionItem] = []
    running_balance = initial_balance
    total_inc = 0
    total_exp = 0
    lowest_balance = initial_balance
    negative_months = 0
    
    for y, m, m_str, m_label in future_months:
        start_bal = running_balance
        
        inc_month = 0
        exp_mandatory = 0
        exp_necessary = 0
        exp_discretionary = 0
        exp_other = 0
        cc_invoices = 0
        
        # Mapeamento de schedules que já possuem transação gerada para este mês
        covered_schedule_ids = set()
        
        for t in transactions:
            # Checa se a transação pertence a este mês
            is_in_month = False
            if t.credit_card_id and t.invoice_month and t.invoice_year:
                if t.invoice_year == y and t.invoice_month == m:
                    is_in_month = True
            elif t.due_date and t.due_date.startswith(m_str):
                is_in_month = True
                
            if not is_in_month:
                continue
                
            if t.schedule_id:
                covered_schedule_ids.add(t.schedule_id)
                
            if t.type == "RECEITA":
                inc_month += t.amount_cents
            elif t.type == "DESPESA":
                nature = t.category.nature if t.category else "NENHUM"
                if t.credit_card_id and not t.is_invoice_payment:
                    cc_invoices += t.amount_cents
                
                if nature == "OBRIGATORIO":
                    exp_mandatory += t.amount_cents
                elif nature == "NECESSARIO":
                    exp_necessary += t.amount_cents
                elif nature == "DESEJO":
                    exp_discretionary += t.amount_cents
                else:
                    exp_other += t.amount_cents
                    
        # Para schedules ativos que ainda não geraram linha de transação para este mês futuro
        for s in active_schedules:
            if s.id not in covered_schedule_ids:
                if s.type == "RECEITA":
                    inc_month += s.amount_cents
                elif s.type == "DESPESA":
                    nature = s.category.nature if s.category else "NENHUM"
                    if nature == "OBRIGATORIO":
                        exp_mandatory += s.amount_cents
                    elif nature == "NECESSARIO":
                        exp_necessary += s.amount_cents
                    elif nature == "DESEJO":
                        exp_discretionary += s.amount_cents
                    else:
                        exp_other += s.amount_cents
                        
        exp_month = exp_mandatory + exp_necessary + exp_discretionary + exp_other
        net_month = inc_month - exp_month
        running_balance += net_month
        
        total_inc += inc_month
        total_exp += exp_month
        
        if running_balance < lowest_balance:
            lowest_balance = running_balance
            
        is_neg = running_balance < 0
        if is_neg:
            negative_months += 1
            
        projection_items.append(CashflowProjectionItem(
            month=m_str,
            month_name=m_label,
            starting_balance_cents=start_bal,
            projected_income_cents=inc_month,
            projected_expense_cents=exp_month,
            expense_mandatory_cents=exp_mandatory,
            expense_necessary_cents=exp_necessary,
            expense_discretionary_cents=exp_discretionary,
            expense_other_cents=exp_other,
            credit_card_invoices_cents=cc_invoices,
            net_balance_cents=net_month,
            accumulated_balance_cents=running_balance,
            is_negative_alert=is_neg
        ))
        
    return CashflowProjectionResponse(
        profile=profile, # type: ignore
        horizon_months=months,
        current_balance_cents=initial_balance,
        lowest_balance_cents=lowest_balance,
        negative_months_count=negative_months,
        total_projected_income_cents=total_inc,
        total_projected_expense_cents=total_exp,
        projected_net_cents=total_inc - total_exp,
        items=projection_items
    )


# ==========================================
# 2. SIMULADOR DE CENÁRIOS ("WHAT-IF")
# ==========================================

@router.post("/simulate", response_model=ScenarioSimulationResponse)
async def simulate_scenario(
    payload: ScenarioSimulationRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    # Obter projeção base primeiro
    base_projection = await get_cashflow_projection(
        profile=payload.profile,
        months=payload.months,
        db=db,
        _=None # type: ignore
    )
    
    simulated_items: List[ScenarioSimulationItem] = []
    simulated_running = base_projection.current_balance_cents
    
    for item in base_projection.items:
        # 1. Aplica variação de receitas
        inc_factor = 1.0 + (payload.income_variation_percent / 100.0)
        sim_inc = int(item.projected_income_cents * inc_factor) + payload.additional_monthly_income_cents
        
        # 2. Aplica cortes de despesas por natureza
        man_cut = max(0.0, min(100.0, payload.mandatory_cut_percent)) / 100.0
        nec_cut = max(0.0, min(100.0, payload.necessary_cut_percent)) / 100.0
        dis_cut = max(0.0, min(100.0, payload.discretionary_cut_percent)) / 100.0
        
        sim_man = int(item.expense_mandatory_cents * (1.0 - man_cut))
        sim_nec = int(item.expense_necessary_cents * (1.0 - nec_cut))
        sim_dis = int(item.expense_discretionary_cents * (1.0 - dis_cut))
        sim_oth = item.expense_other_cents
        
        sim_exp = sim_man + sim_nec + sim_dis + sim_oth + payload.additional_monthly_expense_cents
        sim_net = sim_inc - sim_exp
        simulated_running += sim_net
        
        delta = simulated_running - item.accumulated_balance_cents
        
        simulated_items.append(ScenarioSimulationItem(
            month=item.month,
            month_name=item.month_name,
            base_accumulated_cents=item.accumulated_balance_cents,
            simulated_accumulated_cents=simulated_running,
            delta_cents=delta
        ))
        
    base_final = base_projection.items[-1].accumulated_balance_cents if base_projection.items else 0
    sim_final = simulated_running
    total_delta = sim_final - base_final
    savings = max(0, total_delta)
    
    return ScenarioSimulationResponse(
        profile=payload.profile,
        months=payload.months,
        base_final_balance_cents=base_final,
        simulated_final_balance_cents=sim_final,
        total_delta_cents=total_delta,
        total_savings_generated_cents=savings,
        items=simulated_items
    )


# ==========================================
# 3. RUNWAY, FÔLEGO & RESERVA DE EMERGÊNCIA
# ==========================================

@router.get("/runway", response_model=RunwayResponse)
async def get_runway_metrics(
    profile: str = Query(..., description="PESSOAL ou EMPRESA"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    current_balance = await get_current_profile_balance(profile, db)
    
    # Busca despesas dos últimos 3 meses concluídas para calcular média mensal real
    today = datetime.now(timezone.utc)
    curr_y = today.year
    curr_m = today.month
    
    past_3_months = []
    m, y = curr_m, curr_y
    for _ in range(3):
        m -= 1
        if m < 1:
            m = 12
            y -= 1
        past_3_months.append(f"{y:04d}-{m:02d}")
        
    hist_query = select(
        Category.nature,
        func.coalesce(func.sum(Transaction.amount_cents), 0)
    ).join(Category, Transaction.category_id == Category.id, isouter=True).where(
        Transaction.profile == profile,
        Transaction.type == "DESPESA",
        Transaction.status == "CONCLUIDO",
        or_(*[Transaction.due_date.startswith(p_m) for p_m in past_3_months])
    ).group_by(Category.nature)
    
    hist_res = await db.execute(hist_query)
    nature_sums = {row[0] or "NENHUM": row[1] for row in hist_res.all()}
    
    # Médias mensais dividindo por 3
    avg_mandatory = int(nature_sums.get("OBRIGATORIO", 0) / 3)
    avg_necessary = int(nature_sums.get("NECESSARIO", 0) / 3)
    avg_discretionary = int(nature_sums.get("DESEJO", 0) / 3)
    avg_other = int(nature_sums.get("NENHUM", 0) / 3)
    
    essential_cost = avg_mandatory + avg_necessary
    total_cost = essential_cost + avg_discretionary + avg_other
    
    # Fallback se histórico for nulo: pegar pendentes do mês atual
    if essential_cost == 0:
        current_m_str = f"{curr_y:04d}-{curr_m:02d}"
        cur_query = select(
            Category.nature,
            func.coalesce(func.sum(Transaction.amount_cents), 0)
        ).join(Category, Transaction.category_id == Category.id, isouter=True).where(
            Transaction.profile == profile,
            Transaction.type == "DESPESA",
            Transaction.due_date.startswith(current_m_str)
        ).group_by(Category.nature)
        cur_res = await db.execute(cur_query)
        c_sums = {row[0] or "NENHUM": row[1] for row in cur_res.all()}
        avg_mandatory = c_sums.get("OBRIGATORIO", 0)
        avg_necessary = c_sums.get("NECESSARIO", 0)
        avg_discretionary = c_sums.get("DESEJO", 0)
        essential_cost = avg_mandatory + avg_necessary
        total_cost = essential_cost + avg_discretionary + c_sums.get("NENHUM", 0)
        
    # Se ainda for 0, fallback prudencial mínimo
    if essential_cost == 0:
        essential_cost = 10000 # R$ 100,00 fictício para evitar divisão por zero
        total_cost = 10000
        
    runway_calc = (current_balance / essential_cost) if current_balance > 0 else 0.0
    runway_months = round(max(0.0, runway_calc), 1)
    
    # Status de Saúde Financeira
    if runway_months >= 12.0:
        health = "EXCELENTE"
    elif runway_months >= 6.0:
        health = "BOM"
    elif runway_months >= 3.0:
        health = "MODERADO"
    else:
        health = "CRITICO"
        
    # Metas recomendadas
    if profile == "PESSOAL":
        recommended_reserve = essential_cost * 6 # 6 meses de gastos essenciais
        fire_number = total_cost * 12 * 25 # 25x custo total anual
        burn_rate = None
    else:
        recommended_reserve = total_cost * 3 # 3 meses de despesas totais PJ
        fire_number = None
        burn_rate = total_cost
        
    gap = max(0, recommended_reserve - current_balance)
    
    return RunwayResponse(
        profile=profile, # type: ignore
        current_liquid_balance_cents=current_balance,
        essential_monthly_cost_cents=essential_cost,
        discretionary_monthly_cost_cents=avg_discretionary,
        total_monthly_cost_cents=total_cost,
        runway_months=runway_months,
        health_status=health, # type: ignore
        recommended_reserve_cents=recommended_reserve,
        reserve_gap_cents=gap,
        fire_number_cents=fire_number,
        burn_rate_cents=burn_rate
    )


# ==========================================
# 4. METAS COM PROJEÇÃO TEMPORAL
# ==========================================

@router.get("/goals-projection", response_model=GoalProjectionResponse)
async def get_goals_projection(
    profile: str = Query(..., description="PESSOAL ou EMPRESA"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    goals_query = select(Goal).where(Goal.profile == profile).order_by(Goal.created_at.desc())
    goals_res = await db.execute(goals_query)
    goals = goals_res.scalars().all()
    
    today = datetime.now(timezone.utc)
    today_date = today.date()
    
    total_target = 0
    total_current = 0
    total_remaining = 0
    projected_items: List[GoalProjectionItem] = []
    
    for g in goals:
        rem = max(0, g.target_amount_cents - g.current_amount_cents)
        pct = round((g.current_amount_cents / g.target_amount_cents) * 100, 2) if g.target_amount_cents > 0 else 0.0
        
        total_target += g.target_amount_cents
        total_current += g.current_amount_cents
        total_remaining += rem
        
        # Calcular meses desde a criação para média mensal
        try:
            created_dt = datetime.fromisoformat(g.created_at.replace("Z", "+00:00")).date()
            days_active = max(1, (today_date - created_dt).days)
            months_active = max(1, days_active / 30.4)
            monthly_contrib_avg = int(g.current_amount_cents / months_active) if g.current_amount_cents > 0 else 0
        except Exception:
            monthly_contrib_avg = 0
            
        estimated_date = None
        estimated_months = None
        
        if rem == 0:
            estimated_months = 0
            estimated_date = today_date.strftime("%d/%m/%Y")
        elif monthly_contrib_avg > 0:
            estimated_months = ceil(rem / monthly_contrib_avg)
            est_future_dt = today_date + timedelta(days=int(estimated_months * 30.4))
            estimated_date = est_future_dt.strftime("%d/%m/%Y")
            
        required_monthly = None
        if g.target_date and rem > 0:
            try:
                target_dt = datetime.strptime(g.target_date, "%Y-%m-%d").date()
                days_left = (target_dt - today_date).days
                if days_left > 0:
                    months_left = max(1, ceil(days_left / 30.4))
                    required_monthly = ceil(rem / months_left)
                else:
                    required_monthly = rem # Já venceu
            except Exception:
                required_monthly = None
                
        # Ganho estimado de juros em 12 meses (~10.5% a.a. / 0.83% a.m.) sobre o saldo atual
        compound_interest = int(g.current_amount_cents * 0.105) if g.current_amount_cents > 0 else 0
        
        projected_items.append(GoalProjectionItem(
            id=g.id,
            title=g.title,
            target_amount_cents=g.target_amount_cents,
            current_amount_cents=g.current_amount_cents,
            remaining_amount_cents=rem,
            target_date=g.target_date,
            status=g.status,
            progress_percentage=pct,
            monthly_contribution_avg_cents=monthly_contrib_avg,
            estimated_completion_date=estimated_date,
            estimated_months_to_complete=estimated_months,
            required_monthly_deposit_cents=required_monthly,
            compound_interest_gain_cents=compound_interest
        ))
        
    return GoalProjectionResponse(
        profile=profile, # type: ignore
        total_target_cents=total_target,
        total_current_cents=total_current,
        total_remaining_cents=total_remaining,
        goals=projected_items
    )


# ==========================================
# 5. MAPA DE COMPROMETIMENTO DE RENDA
# ==========================================

@router.get("/committed-income", response_model=CommittedIncomeResponse)
async def get_committed_income_map(
    profile: str = Query(..., description="PESSOAL ou EMPRESA"),
    months: int = Query(6, ge=1, le=12, description="Meses a analisar"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    today = datetime.now(timezone.utc)
    future_months = get_future_months(today.year, today.month, months)
    
    # 1. Projeção de fluxo de caixa para ter a receita prevista
    projection = await get_cashflow_projection(
        profile=profile,
        months=months,
        db=db,
        _=None # type: ignore
    )
    
    # Mapear receitas por mês
    inc_by_month = {item.month: item.projected_income_cents for item in projection.items}
    
    # 2. Carrega dívidas ativas
    debts_res = await db.execute(select(Debt).where(Debt.profile == profile, Debt.status == "ATIVA"))
    debts = debts_res.scalars().all()
    
    # 3. Carrega schedules
    sched_res = await db.execute(select(Schedule).where(Schedule.profile == profile, Schedule.status == "ATIVO", Schedule.type == "DESPESA"))
    schedules = sched_res.scalars().all()
    sched_monthly_cents = sum(s.amount_cents for s in schedules)
    
    items: List[CommittedIncomeItem] = []
    total_pct = 0.0
    
    for item in projection.items:
        m_str = item.month
        m_label = item.month_name
        inc_m = inc_by_month.get(m_str, 0)
        
        # Se receita projetada for 0, usar média de receitas passadas como referência de renda
        if inc_m == 0:
            inc_m = 500000 # R$ 5.000 como baseline prudencial para evitar % infinita
            
        sched_cents = sched_monthly_cents
        cc_cents = item.credit_card_invoices_cents
        
        # Dívidas para o mês
        debt_cents = 0
        for d in debts:
            if d.due_date and d.due_date.startswith(m_str):
                debt_cents += d.remaining_amount_cents
                
        committed_total = sched_cents + cc_cents + debt_cents
        pct_committed = round((committed_total / inc_m) * 100, 1) if inc_m > 0 else 100.0
        free_cents = max(0, inc_m - committed_total)
        free_pct = round((free_cents / inc_m) * 100, 1) if inc_m > 0 else 0.0
        
        total_pct += pct_committed
        
        items.append(CommittedIncomeItem(
            month=m_str,
            month_name=m_label,
            projected_income_cents=inc_m,
            schedules_amount_cents=sched_cents,
            debts_amount_cents=debt_cents,
            credit_card_amount_cents=cc_cents,
            total_committed_cents=committed_total,
            committed_percentage=pct_committed,
            free_income_cents=free_cents,
            free_income_percentage=free_pct
        ))
        
    avg_committed = round(total_pct / len(items), 1) if items else 0.0
    
    return CommittedIncomeResponse(
        profile=profile, # type: ignore
        average_committed_percentage=avg_committed,
        items=items
    )
