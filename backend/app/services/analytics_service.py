import calendar
from datetime import datetime, date, timedelta, timezone
from typing import Any
from collections import defaultdict
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from dateutil.rrule import rrulestr

from app.models.wallet_account import WalletAccount
from app.models.category import Category
from app.models.wallet_label import WalletLabel
from app.models.wallet_record import WalletRecord, WalletRecordLabel
from app.models.wallet_budget import WalletBudget
from app.models.wallet_standing_order import WalletStandingOrder, WalletStandingOrderItem
from app.models.wallet_goal import WalletGoal
from app.models.wallet_integration import WalletIntegration
from app.schemas.analytics import (
    FinancialOverviewResponse,
    HistoricalAnalyticsResponse,
    FutureAnalyticsResponse,
    NetWorthSummary,
    NetWorthPoint,
    CashFlowMonthly,
    EssentialityBreakdown,
    CategoryBreakdown,
    LabelBreakdown,
    ReconciliationMetrics,
    DailyBalanceProjection,
    UpcomingScheduledItem,
    GoalProjection,
    BudgetForecast,
    LiquidityAlert,
)

MONTH_NAMES = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
]

WEEKDAY_NAMES = [
    "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"
]

ESSENTIALITY_CONFIG: dict[str, dict[str, str]] = {
    "OBRIGATORIO": {"label": "Obrigatório", "color": "#f43f5e"},
    "NECESSARIO": {"label": "Necessário", "color": "#f59e0b"},
    "DESEJO": {"label": "Desejo", "color": "#0ea5e9"},
    "NENHUM": {"label": "Geral / Outros", "color": "#71717a"},
}

LIABILITY_ACCOUNT_TYPES = {"CreditCard", "Loan", "Mortgage", "Overdraft"}


async def get_financial_overview(db: AsyncSession, user_id: str) -> FinancialOverviewResponse:
    """Calcula os principais KPIs financeiros para exibição imediata no Dashboard."""
    today = date.today()
    current_month_prefix = today.strftime("%Y-%m")

    # 1. Contas & Patrimônio Líquido
    acc_res = await db.execute(select(WalletAccount).where(WalletAccount.user_id == user_id))
    accounts = acc_res.scalars().all()

    assets_cents = 0
    liabilities_cents = 0
    liquid_balance_cents = 0

    for acc in accounts:
        if acc.account_type in LIABILITY_ACCOUNT_TYPES:
            # Empréstimos ou saldos devedores de cartão
            liabilities_cents += abs(acc.current_balance_cents)
        else:
            assets_cents += acc.current_balance_cents
            if not acc.exclude_from_stats:
                liquid_balance_cents += acc.current_balance_cents

    net_worth_cents = assets_cents - liabilities_cents

    # 2. Receitas e Despesas do Mês Atual
    rec_res = await db.execute(
        select(WalletRecord).where(
            WalletRecord.user_id == user_id,
            WalletRecord.record_date.startswith(current_month_prefix),
            WalletRecord.record_state != "void",
            WalletRecord.is_transfer == False,  # noqa: E712
        )
    )
    month_records = rec_res.scalars().all()

    month_income_cents = sum(r.amount_cents for r in month_records if r.record_type == "RECEITA")
    month_expense_cents = sum(r.amount_cents for r in month_records if r.record_type == "DESPESA")
    month_balance_cents = month_income_cents - month_expense_cents

    savings_rate = 0.0
    if month_income_cents > 0:
        savings_rate = round((month_balance_cents / month_income_cents) * 100, 1)

    # 3. Contagem de Entidades
    so_count = await db.scalar(
        select(func.count(WalletStandingOrder.id)).where(
            WalletStandingOrder.user_id == user_id,
            WalletStandingOrder.is_active == True,  # noqa: E712
        )
    ) or 0

    goal_count = await db.scalar(
        select(func.count(WalletGoal.id)).where(
            WalletGoal.user_id == user_id,
            WalletGoal.state == "active",
        )
    ) or 0

    # 4. Projeção de 30 dias para alerta de liquidez
    future_data = await get_future_analytics(db=db, user_id=user_id, horizon_days=30)
    projected_30d_balance = (
        future_data.daily_projections[-1].projected_balance_cents
        if future_data.daily_projections
        else liquid_balance_cents
    )

    # 5. Data do último sync
    integ_res = await db.execute(select(WalletIntegration).where(WalletIntegration.user_id == user_id))
    integ = integ_res.scalar_one_or_none()

    return FinancialOverviewResponse(
        current_net_worth_cents=net_worth_cents,
        current_month_income_cents=month_income_cents,
        current_month_expense_cents=month_expense_cents,
        current_month_balance_cents=month_balance_cents,
        savings_rate_percent=savings_rate,
        projected_30d_balance_cents=projected_30d_balance,
        total_accounts_count=len(accounts),
        active_standing_orders_count=so_count,
        active_goals_count=goal_count,
        liquidity_risk_detected=len(future_data.liquidity_alerts) > 0,
        last_sync_at=integ.last_sync_at if integ else None,
    )


async def get_historical_analytics(
    db: AsyncSession,
    user_id: str,
    months: int = 12,
) -> HistoricalAnalyticsResponse:
    """Gera diagnóstico histórico: Net Worth, fluxo de caixa, essencialidade e conciliação."""
    today = date.today()

    # Contas atuais
    acc_res = await db.execute(select(WalletAccount).where(WalletAccount.user_id == user_id))
    accounts = acc_res.scalars().all()

    assets_cents = sum(a.current_balance_cents for a in accounts if a.account_type not in LIABILITY_ACCOUNT_TYPES)
    liabilities_cents = sum(abs(a.current_balance_cents) for a in accounts if a.account_type in LIABILITY_ACCOUNT_TYPES)
    current_net_worth = assets_cents - liabilities_cents

    net_worth_summary = NetWorthSummary(
        total_net_worth_cents=current_net_worth,
        total_assets_cents=assets_cents,
        total_liabilities_cents=liabilities_cents,
        currency_code="BRL",
    )

    # Transações no período (últimos N meses)
    start_date = (today.replace(day=1) - timedelta(days=months * 30)).replace(day=1)
    start_date_str = start_date.isoformat()

    records_res = await db.execute(
        select(WalletRecord)
        .options(selectinload(WalletRecord.category), selectinload(WalletRecord.labels))
        .where(
            WalletRecord.user_id == user_id,
            WalletRecord.record_date >= start_date_str,
            WalletRecord.record_state != "void",
        )
        .order_by(WalletRecord.record_date.asc())
    )
    records = records_res.scalars().all()

    # 1. Fluxo de Caixa Mensal
    monthly_data: dict[str, dict[str, int]] = defaultdict(lambda: {"income": 0, "expense": 0})
    for r in records:
        if r.is_transfer:
            continue
        period = r.record_date[:7]  # YYYY-MM
        if r.record_type == "RECEITA":
            monthly_data[period]["income"] += r.amount_cents
        elif r.record_type == "DESPESA":
            monthly_data[period]["expense"] += r.amount_cents

    cash_flow_list: list[CashFlowMonthly] = []
    for period in sorted(monthly_data.keys()):
        inc = monthly_data[period]["income"]
        exp = monthly_data[period]["expense"]
        net_sav = inc - exp
        rate = round((net_sav / inc) * 100, 1) if inc > 0 else 0.0
        
        m_num = int(period.split("-")[1])
        m_name = f"{MONTH_NAMES[m_num - 1]}/{period.split('-')[0][2:]}"

        cash_flow_list.append(
            CashFlowMonthly(
                period=period,
                month_name=m_name,
                income_cents=inc,
                expense_cents=exp,
                net_savings_cents=net_sav,
                savings_rate_percent=rate,
            )
        )

    # 2. Histórico de Net Worth aproximado mês a mês
    net_worth_points: list[NetWorthPoint] = []
    running_assets = assets_cents
    for cf in reversed(cash_flow_list):
        net_worth_points.insert(
            0,
            NetWorthPoint(
                date=f"{cf.period}-01",
                net_worth_cents=running_assets - liabilities_cents,
                assets_cents=running_assets,
                liabilities_cents=liabilities_cents,
            )
        )
        # Recua a variação líquida para o mês anterior
        running_assets -= cf.net_savings_cents

    # 3. Decomposição por Cardinalidade (Essencialidade)
    essentiality_sums: dict[str, int] = defaultdict(int)
    total_expenses = 0
    for r in records:
        if r.record_type == "DESPESA" and not r.is_transfer:
            card = r.category.cardinality if r.category and r.category.cardinality else "NENHUM"
            essentiality_sums[card] += r.amount_cents
            total_expenses += r.amount_cents

    by_essentiality: list[EssentialityBreakdown] = []
    for card_key in ("OBRIGATORIO", "NECESSARIO", "DESEJO", "NENHUM"):
        tot = essentiality_sums.get(card_key, 0)
        pct = round((tot / total_expenses) * 100, 1) if total_expenses > 0 else 0.0
        cfg = ESSENTIALITY_CONFIG.get(card_key, {"label": card_key, "color": "#71717a"})
        by_essentiality.append(
            EssentialityBreakdown(
                cardinality=card_key,
                label=cfg["label"],
                total_cents=tot,
                percentage=pct,
                color=cfg["color"],
            )
        )

    # 4. Top Categorias
    cat_sums: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"cents": 0, "count": 0, "name": "Sem Categoria", "color": "#6366f1", "icon": "Tag", "group": None, "card": "NENHUM"}
    )
    for r in records:
        if r.record_type == "DESPESA" and not r.is_transfer:
            c_id = r.category_id or "uncategorized"
            c_name = r.category.name if r.category else "Sem Categoria"
            c_color = r.category.color if r.category else "#6366f1"
            c_icon = r.category.icon if r.category else "Tag"
            c_group = r.category.group_name if r.category else None
            c_card = r.category.cardinality if r.category else "NENHUM"

            cat_sums[c_id]["cents"] += r.amount_cents
            cat_sums[c_id]["count"] += 1
            cat_sums[c_id]["name"] = c_name
            cat_sums[c_id]["color"] = c_color
            cat_sums[c_id]["icon"] = c_icon
            cat_sums[c_id]["group"] = c_group
            cat_sums[c_id]["card"] = c_card

    top_categories: list[CategoryBreakdown] = []
    for c_id, val in sorted(cat_sums.items(), key=lambda x: x[1]["cents"], reverse=True)[:8]:
        pct = round((val["cents"] / total_expenses) * 100, 1) if total_expenses > 0 else 0.0
        top_categories.append(
            CategoryBreakdown(
                category_id=c_id,
                name=val["name"],
                group_name=val["group"],
                color=val["color"],
                icon=val["icon"],
                cardinality=val["card"],
                total_cents=val["cents"],
                percentage=pct,
                records_count=val["count"],
            )
        )

    # 5. Top Etiquetas (Labels)
    label_sums: dict[str, dict[str, Any]] = defaultdict(lambda: {"cents": 0, "count": 0, "name": "", "color": "#64748b"})
    for r in records:
        if r.record_type == "DESPESA" and not r.is_transfer and r.labels:
            for lbl in r.labels:
                label_sums[lbl.id]["cents"] += r.amount_cents
                label_sums[lbl.id]["count"] += 1
                label_sums[lbl.id]["name"] = lbl.name
                label_sums[lbl.id]["color"] = lbl.color

    top_labels: list[LabelBreakdown] = [
        LabelBreakdown(
            label_id=l_id,
            name=v["name"],
            color=v["color"],
            total_cents=v["cents"],
            records_count=v["count"],
        )
        for l_id, v in sorted(label_sums.items(), key=lambda x: x[1]["cents"], reverse=True)[:6]
    ]

    # 6. Métricas de Conciliação
    reconciled_c = sum(1 for r in records if r.record_state == "reconciled")
    cleared_c = sum(1 for r in records if r.record_state == "cleared")
    uncleared_c = sum(1 for r in records if r.record_state == "uncleared")
    void_c = sum(1 for r in records if r.record_state == "void")
    total_valid = len(records)
    reconciled_pct = round((reconciled_c / total_valid) * 100, 1) if total_valid > 0 else 0.0

    reconciliation = ReconciliationMetrics(
        total_records=total_valid,
        reconciled_count=reconciled_c,
        cleared_count=cleared_c,
        uncleared_count=uncleared_c,
        void_count=void_c,
        reconciled_percent=reconciled_pct,
    )

    return HistoricalAnalyticsResponse(
        net_worth=net_worth_summary,
        net_worth_history=net_worth_points,
        monthly_cash_flow=cash_flow_list,
        by_essentiality=by_essentiality,
        top_categories=top_categories,
        top_labels=top_labels,
        reconciliation=reconciliation,
    )


async def get_future_analytics(
    db: AsyncSession,
    user_id: str,
    horizon_days: int = 90,
) -> FutureAnalyticsResponse:
    """Calcula projeções preditivas de fluxo de caixa, cumprimento de metas e risco de liquidez."""
    today = date.today()
    end_date = today + timedelta(days=horizon_days)

    # 1. Saldo Líquido Inicial
    acc_res = await db.execute(select(WalletAccount).where(WalletAccount.user_id == user_id))
    accounts = acc_res.scalars().all()

    liquid_balance_cents = sum(
        a.current_balance_cents
        for a in accounts
        if a.account_type not in LIABILITY_ACCOUNT_TYPES and not a.exclude_from_stats
    )

    # 2. Ordens Permanentes e Recorrências
    so_res = await db.execute(
        select(WalletStandingOrder)
        .options(selectinload(WalletStandingOrder.account), selectinload(WalletStandingOrder.category))
        .where(
            WalletStandingOrder.user_id == user_id,
            WalletStandingOrder.is_active == True,  # noqa: E712
        )
    )
    standing_orders = so_res.scalars().all()

    # Ocorrências geradas da API
    soi_res = await db.execute(
        select(WalletStandingOrderItem)
        .join(WalletStandingOrderItem.standing_order)
        .where(
            WalletStandingOrder.user_id == user_id,
            WalletStandingOrderItem.original_date >= today.isoformat(),
            WalletStandingOrderItem.original_date <= end_date.isoformat(),
            WalletStandingOrderItem.is_dismissed == False,  # noqa: E712
            WalletStandingOrderItem.paid_date == None,  # noqa: E711
        )
    )
    soi_items = soi_res.scalars().all()
    scheduled_soi_dates: dict[str, set[str]] = defaultdict(set)
    for it in soi_items:
        scheduled_soi_dates[it.standing_order_id].add(it.original_date)

    # Mapeamento diário de movimentações projetadas
    daily_flows: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"inflow": 0, "outflow": 0, "items": []}
    )
    upcoming_items_list: list[UpcomingScheduledItem] = []

    for so in standing_orders:
        acc_name = so.account.name if so.account else "Conta Principal"
        cat_name = so.category.name if so.category else "Recorrente"
        cat_color = so.category.color if so.category else "#6366f1"

        occurrences: list[date] = []
        if so.recurrence_rule:
            try:
                # Expansão RRULE
                rule_obj = rrulestr(
                    so.recurrence_rule,
                    dtstart=datetime.combine(date.fromisoformat(so.due_date), datetime.min.time()),
                )
                dt_list = rule_obj.between(
                    datetime.combine(today, datetime.min.time()),
                    datetime.combine(end_date, datetime.max.time()),
                    inc=True,
                )
                occurrences = [d.date() for d in dt_list]
            except Exception:
                # Fallback simples mensal
                cur_d = date.fromisoformat(so.due_date) if so.due_date else today
                while cur_d <= end_date:
                    if cur_d >= today:
                        occurrences.append(cur_d)
                    cur_d = (cur_d.replace(day=1) + timedelta(days=32)).replace(day=min(cur_d.day, 28))

        # Adiciona ocorrências explícitas da API que não tenham sido calculadas pelo rrule
        for orig_date_str in scheduled_soi_dates.get(so.id, set()):
            d_obj = date.fromisoformat(orig_date_str)
            if d_obj not in occurrences:
                occurrences.append(d_obj)

        for occ_date in sorted(occurrences):
            d_str = occ_date.isoformat()
            if so.record_type == "RECEITA":
                daily_flows[d_str]["inflow"] += so.amount_cents
            else:
                daily_flows[d_str]["outflow"] += so.amount_cents

            daily_flows[d_str]["items"].append(so.name)

            if occ_date <= today + timedelta(days=30):
                upcoming_items_list.append(
                    UpcomingScheduledItem(
                        id=f"{so.id}_{d_str}",
                        name=so.name,
                        amount_cents=so.amount_cents,
                        record_type=so.record_type,
                        due_date=d_str,
                        account_name=acc_name,
                        category_name=cat_name,
                        category_color=cat_color,
                        recurrence_rule=so.recurrence_rule,
                        reminder=so.reminder,
                    )
                )

    upcoming_items_list.sort(key=lambda x: x.due_date)

    # 3. Construção da Simulação Dia a Dia
    daily_projections: list[DailyBalanceProjection] = []
    running_balance = liquid_balance_cents
    lowest_balance = liquid_balance_cents
    lowest_date: str | None = None
    liquidity_alerts: list[LiquidityAlert] = []

    current_sim_date = today
    while current_sim_date <= end_date:
        d_str = current_sim_date.isoformat()
        flow = daily_flows[d_str]
        inflow = flow["inflow"]
        outflow = flow["outflow"]

        running_balance += inflow - outflow
        is_neg = running_balance < 0

        if running_balance < lowest_balance:
            lowest_balance = running_balance
            lowest_date = d_str

        if is_neg:
            # Emite alerta caso ainda não tenha emitido para o mesmo mês
            deficit = abs(running_balance)
            already_alerted = any(a.date_expected[:7] == d_str[:7] for a in liquidity_alerts)
            if not already_alerted:
                liquidity_alerts.append(
                    LiquidityAlert(
                        severity="critical" if deficit > 100000 else "warning",
                        title="Risco de Saldo Negativo",
                        description=f"O saldo projetado atingirá R$ -{deficit/100:.2f} em {d_str} devido a compromissos agendados.",
                        date_expected=d_str,
                        projected_deficit_cents=deficit,
                    )
                )

        daily_projections.append(
            DailyBalanceProjection(
                date=d_str,
                weekday=WEEKDAY_NAMES[current_sim_date.weekday()],
                day_inflow_cents=inflow,
                day_outflow_cents=outflow,
                projected_balance_cents=running_balance,
                is_negative=is_neg,
                scheduled_items_count=len(flow["items"]),
            )
        )
        current_sim_date += timedelta(days=1)

    # 4. Projeção de Cumprimento de Metas (Goals)
    goals_res = await db.execute(select(WalletGoal).where(WalletGoal.user_id == user_id))
    goals = goals_res.scalars().all()

    # Poupança média histórica mensal (últimos 3 meses)
    hist_cf = await get_historical_analytics(db=db, user_id=user_id, months=3)
    avg_monthly_savings = 0
    if hist_cf.monthly_cash_flow:
        avg_monthly_savings = sum(cf.net_savings_cents for cf in hist_cf.monthly_cash_flow) // len(hist_cf.monthly_cash_flow)

    goals_projections: list[GoalProjection] = []
    for g in goals:
        needed = max(0, g.target_amount_cents - g.current_amount_cents)
        pct = round((g.current_amount_cents / g.target_amount_cents) * 100, 1) if g.target_amount_cents > 0 else 100.0

        est_date_str: str | None = None
        on_track = False

        if needed == 0:
            on_track = True
            est_date_str = today.isoformat()
        elif avg_monthly_savings > 0:
            months_needed = max(1, round(needed / avg_monthly_savings))
            est_date = today + timedelta(days=months_needed * 30)
            est_date_str = est_date.isoformat()
            if g.desired_date:
                on_track = est_date_str <= g.desired_date
            else:
                on_track = True

        monthly_needed = 0
        if g.desired_date and g.desired_date > today.isoformat():
            try:
                target_d = date.fromisoformat(g.desired_date)
                m_remaining = max(1, (target_d.year - today.year) * 12 + (target_d.month - today.month))
                monthly_needed = needed // m_remaining
            except Exception:
                pass

        goals_projections.append(
            GoalProjection(
                goal_id=g.id,
                name=g.name,
                target_amount_cents=g.target_amount_cents,
                current_amount_cents=g.current_amount_cents,
                progress_percent=pct,
                desired_date=g.desired_date,
                estimated_completion_date=est_date_str,
                is_on_track=on_track,
                monthly_savings_needed_cents=monthly_needed,
                state=g.state,
            )
        )

    # 5. Previsão de Orçamentos (Budgets Forecast)
    budgets_res = await db.execute(
        select(WalletBudget).where(
            WalletBudget.user_id == user_id,
            WalletBudget.is_active == True,  # noqa: E712
        )
    )
    budgets = budgets_res.scalars().all()

    # Dias no mês atual
    _, total_days_in_month = calendar.monthrange(today.year, today.month)
    current_day = max(1, today.day)
    days_remaining = total_days_in_month - current_day

    # Gastos do mês atual
    month_prefix = today.strftime("%Y-%m")
    m_recs_res = await db.execute(
        select(WalletRecord).where(
            WalletRecord.user_id == user_id,
            WalletRecord.record_date.startswith(month_prefix),
            WalletRecord.record_type == "DESPESA",
            WalletRecord.record_state != "void",
            WalletRecord.is_transfer == False,  # noqa: E712
        )
    )
    current_month_expenses = m_recs_res.scalars().all()
    total_spent_this_month = sum(r.amount_cents for r in current_month_expenses)

    budgets_forecast: list[BudgetForecast] = []
    for b in budgets:
        # Simplificação: gasto proporcional ou geral caso o orçamento seja global
        spent = total_spent_this_month
        daily_burn = spent // current_day
        projected_end = daily_burn * total_days_in_month
        is_exceeded = projected_end > b.amount_cents
        remaining = max(0, b.amount_cents - spent)

        budgets_forecast.append(
            BudgetForecast(
                budget_id=b.id,
                name=b.name,
                limit_cents=b.amount_cents,
                spent_so_far_cents=spent,
                projected_end_of_period_cents=projected_end,
                is_exceeded_projected=is_exceeded,
                burn_rate_daily_cents=daily_burn,
                remaining_cents=remaining,
                days_remaining=days_remaining,
            )
        )

    return FutureAnalyticsResponse(
        horizon_days=horizon_days,
        current_liquid_balance_cents=liquid_balance_cents,
        projected_lowest_balance_cents=lowest_balance,
        projected_lowest_date=lowest_date,
        daily_projections=daily_projections,
        upcoming_scheduled=upcoming_items_list,
        goals_projections=goals_projections,
        budgets_forecast=budgets_forecast,
        liquidity_alerts=liquidity_alerts,
    )
