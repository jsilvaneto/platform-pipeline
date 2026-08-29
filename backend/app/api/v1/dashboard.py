from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, case
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Transaction, Category, User, Account, CreditCard, Debt, Budget, Goal, PaymentMethod, Contact
from app.schemas.dashboard import (
    DashboardSummaryResponse, CategoryBreakdown, AccountBalanceSummary,
    MonthlyTrendItem, NatureBreakdown, BudgetSummaryItem, UpcomingTransactionItem,
    PaymentMethodDistribution, GoalSummaryItem
)
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard Analítico"])

MONTH_SHORT_NAMES = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
]

@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    profile: str = Query(..., description="PESSOAL ou EMPRESA"),
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    today = datetime.now(timezone.utc)
    today_str = today.strftime("%Y-%m-%d")
    month_str = f"{year:04d}-{month:02d}"

    # 1. Realizados no Mês (Status = CONCLUIDO)
    inc_real_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
        Transaction.profile == profile,
        Transaction.type == "RECEITA",
        Transaction.status == "CONCLUIDO",
        Transaction.due_date.startswith(month_str)
    )
    inc_real = (await db.execute(inc_real_query)).scalar() or 0

    exp_real_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
        Transaction.profile == profile,
        Transaction.type == "DESPESA",
        Transaction.status == "CONCLUIDO",
        Transaction.is_invoice_payment == 0,
        Transaction.due_date.startswith(month_str)
    )
    exp_real = (await db.execute(exp_real_query)).scalar() or 0

    # 2. Pendentes no Mês (Status = PENDENTE)
    inc_pend_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
        Transaction.profile == profile,
        Transaction.type == "RECEITA",
        Transaction.status == "PENDENTE",
        Transaction.due_date.startswith(month_str)
    )
    inc_pend = (await db.execute(inc_pend_query)).scalar() or 0

    exp_pend_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
        Transaction.profile == profile,
        Transaction.type == "DESPESA",
        Transaction.status == "PENDENTE",
        Transaction.is_invoice_payment == 0,
        Transaction.due_date.startswith(month_str)
    )
    exp_pend = (await db.execute(exp_pend_query)).scalar() or 0

    savings_rate = round(((inc_real - exp_real) / inc_real) * 100, 1) if inc_real > 0 else 0.0

    # 3. Alertas Operacionais
    # Atrasados (Vencimento anterior a hoje e ainda pendente)
    overdue_query = select(
        func.count(Transaction.id),
        func.coalesce(func.sum(Transaction.amount_cents), 0)
    ).where(
        Transaction.profile == profile,
        Transaction.type == "DESPESA",
        Transaction.status == "PENDENTE",
        Transaction.is_invoice_payment == 0,
        Transaction.due_date < today_str
    )
    overdue_count, overdue_amount = (await db.execute(overdue_query)).one()

    # Vencem hoje
    due_today_query = select(
        func.count(Transaction.id),
        func.coalesce(func.sum(Transaction.amount_cents), 0)
    ).where(
        Transaction.profile == profile,
        Transaction.type == "DESPESA",
        Transaction.status == "PENDENTE",
        Transaction.is_invoice_payment == 0,
        Transaction.due_date == today_str
    )
    due_today_count, due_today_amount = (await db.execute(due_today_query)).one()

    # 4. Saldos por Conta e Posição Patrimonial
    accounts_query = select(Account).where(Account.profile == profile).order_by(Account.name)
    accounts = (await db.execute(accounts_query)).scalars().all()

    accounts_balances = []
    total_acc_balance = 0

    for acc in accounts:
        # Entradas realizadas (Receitas creditadas + Transferências recebidas)
        in_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
            Transaction.status == "CONCLUIDO",
            or_(
                (Transaction.type == "RECEITA") & (Transaction.account_id == acc.id),
                (Transaction.type == "TRANSFERENCIA") & (Transaction.destination_account_id == acc.id)
            )
        )
        total_in = (await db.execute(in_query)).scalar() or 0

        # Saídas realizadas (Despesas debitadas + Transferências enviadas)
        out_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
            Transaction.status == "CONCLUIDO",
            or_(
                (Transaction.type == "DESPESA") & (Transaction.account_id == acc.id),
                (Transaction.type == "TRANSFERENCIA") & (Transaction.account_id == acc.id)
            )
        )
        total_out = (await db.execute(out_query)).scalar() or 0

        bal = total_in - total_out
        total_acc_balance += bal
        accounts_balances.append(AccountBalanceSummary(
            account_id=acc.id,
            account_name=acc.name,
            account_type=acc.type,
            balance_cents=bal
        ))

    # Faturas Abertas de Cartões (Despesas em cartão ainda pendentes)
    card_inv_query = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
        Transaction.profile == profile,
        Transaction.credit_card_id.isnot(None),
        Transaction.status == "PENDENTE",
        Transaction.is_invoice_payment == 0
    )
    total_card_invoices = (await db.execute(card_inv_query)).scalar() or 0

    # Dívidas Ativas
    debts_query = select(func.coalesce(func.sum(Debt.remaining_amount_cents), 0)).where(
        Debt.profile == profile,
        Debt.status == "ATIVA"
    )
    total_debts = (await db.execute(debts_query)).scalar() or 0

    net_worth = total_acc_balance - total_card_invoices - total_debts

    # 5. Histórico e Tendência dos Últimos 6 Meses
    historical_trend = []
    for offset in range(5, -1, -1):
        # Calcula o mês retroativo relativo ao ano/mês selecionado
        hist_m = month - offset
        hist_y = year
        while hist_m <= 0:
            hist_m += 12
            hist_y -= 1
        
        hist_str = f"{hist_y:04d}-{hist_m:02d}"
        
        h_inc_q = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
            Transaction.profile == profile,
            Transaction.type == "RECEITA",
            Transaction.status == "CONCLUIDO",
            Transaction.due_date.startswith(hist_str)
        )
        h_inc = (await db.execute(h_inc_q)).scalar() or 0

        h_exp_q = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
            Transaction.profile == profile,
            Transaction.type == "DESPESA",
            Transaction.status == "CONCLUIDO",
            Transaction.is_invoice_payment == 0,
            Transaction.due_date.startswith(hist_str)
        )
        h_exp = (await db.execute(h_exp_q)).scalar() or 0

        h_net = h_inc - h_exp
        h_sav = round((h_net / h_inc) * 100, 1) if h_inc > 0 else 0.0

        historical_trend.append(MonthlyTrendItem(
            month=hist_m,
            year=hist_y,
            label=f"{MONTH_SHORT_NAMES[hist_m - 1]}/{str(hist_y)[2:]}",
            income_realized_cents=h_inc,
            expense_realized_cents=h_exp,
            net_realized_cents=h_net,
            savings_rate=h_sav
        ))

    # 6. Diagnóstico 50-30-20 (Essencialidade de Gastos do Mês)
    nature_q = (
        select(
            Category.nature,
            func.coalesce(func.sum(Transaction.amount_cents), 0).label("total_cents")
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.profile == profile,
            Transaction.type == "DESPESA",
            Transaction.status != "CANCELADO",
            Transaction.is_invoice_payment == 0,
            Transaction.due_date.startswith(month_str)
        )
        .group_by(Category.nature)
    )
    nature_rows = dict((await db.execute(nature_q)).all())
    
    total_expenses_month = exp_real + exp_pend
    nature_labels = {
        "OBRIGATORIO": ("Gastos Fixos & Obrigatórios", 50.0),
        "NECESSARIO": ("Gastos Essenciais & Variáveis", 30.0),
        "DESEJO": ("Desejos, Lazer & Estilo de Vida", 20.0),
        "NENHUM": ("Outros / Não Classificados", 0.0)
    }

    nature_breakdown = []
    for nat_key in ["OBRIGATORIO", "NECESSARIO", "DESEJO", "NENHUM"]:
        amount = nature_rows.get(nat_key, 0)
        pct = round((amount / total_expenses_month) * 100, 1) if total_expenses_month > 0 else 0.0
        label, target_pct = nature_labels[nat_key]
        
        stat = "NORMAL"
        if target_pct > 0:
            if pct > target_pct + 5:
                stat = "EXCEDIDO"
            elif pct > target_pct:
                stat = "ATENCAO"

        nature_breakdown.append(NatureBreakdown(
            nature=nat_key,
            nature_label=label,
            amount_cents=amount,
            percentage=pct,
            target_percentage=target_pct,
            status=stat
        ))

    # 7. Top Categorias de Despesas do Mês
    cat_query = (
        select(
            Category.id,
            Category.name,
            func.coalesce(func.sum(Transaction.amount_cents), 0).label("total_cents")
        )
        .join(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.profile == profile,
            Transaction.type == "DESPESA",
            Transaction.status != "CANCELADO",
            Transaction.is_invoice_payment == 0,
            Transaction.due_date.startswith(month_str)
        )
        .group_by(Category.id, Category.name)
        .order_by(desc("total_cents"))
        .limit(6)
    )
    cat_rows = (await db.execute(cat_query)).all()

    categories_breakdown = [
        CategoryBreakdown(
            category_id=c_id,
            category_name=c_name,
            amount_cents=c_total,
            percentage=round((c_total / total_expenses_month) * 100, 1) if total_expenses_month > 0 else 0.0
        )
        for c_id, c_name, c_total in cat_rows
    ]

    # 8. Monitoramento de Orçamentos (Budgets)
    budgets_q = (
        select(Budget)
        .options(selectinload(Budget.category))
        .where(
            Budget.profile == profile,
            Budget.month == month,
            Budget.year == year
        )
    )
    budgets = (await db.execute(budgets_q)).scalars().all()
    budgets_summary = []

    for b in budgets:
        # Gastos reais nesta categoria no mês
        spent_q = select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
            Transaction.profile == profile,
            Transaction.category_id == b.category_id,
            Transaction.type == "DESPESA",
            Transaction.status != "CANCELADO",
            Transaction.is_invoice_payment == 0,
            Transaction.due_date.startswith(month_str)
        )
        spent = (await db.execute(spent_q)).scalar() or 0
        b_pct = round((spent / b.limit_amount_cents) * 100, 1) if b.limit_amount_cents > 0 else 0.0
        rem = b.limit_amount_cents - spent
        
        b_stat = "NORMAL"
        if spent > b.limit_amount_cents:
            b_stat = "ESTOURADO"
        elif spent >= b.limit_amount_cents * 0.85:
            b_stat = "ATENCAO"

        budgets_summary.append(BudgetSummaryItem(
            budget_id=b.id,
            category_id=b.category_id,
            category_name=b.category.name if b.category else "Categoria",
            limit_amount_cents=b.limit_amount_cents,
            spent_amount_cents=spent,
            percentage=b_pct,
            remaining_cents=rem,
            status=b_stat
        ))

    # 9. Próximos 7 Dias (Timeline & Baixa Rápida)
    end_7_days = (today + timedelta(days=7)).strftime("%Y-%m-%d")
    upcoming_q = (
        select(Transaction)
        .options(
            selectinload(Transaction.category),
            selectinload(Transaction.account),
            selectinload(Transaction.contact)
        )
        .where(
            Transaction.profile == profile,
            Transaction.status == "PENDENTE",
            Transaction.is_invoice_payment == 0,
            Transaction.due_date >= today_str,
            Transaction.due_date <= end_7_days
        )
        .order_by(Transaction.due_date.asc(), Transaction.amount_cents.desc())
        .limit(6)
    )
    upcoming_trans = (await db.execute(upcoming_q)).scalars().all()
    upcoming_7_days = [
        UpcomingTransactionItem(
            id=t.id,
            description=t.description,
            due_date=t.due_date,
            amount_cents=t.amount_cents,
            type=t.type,
            status=t.status,
            category_name=t.category.name if t.category else None,
            account_name=t.account.name if t.account else None,
            contact_name=t.contact.name if t.contact else None
        )
        for t in upcoming_trans
    ]

    # 10. Distribuição por Meio de Pagamento
    pm_q = (
        select(
            Transaction.payment_method_id,
            PaymentMethod.name,
            func.coalesce(func.sum(Transaction.amount_cents), 0).label("total_cents"),
            func.count(Transaction.id).label("count_trans")
        )
        .outerjoin(PaymentMethod, Transaction.payment_method_id == PaymentMethod.id)
        .where(
            Transaction.profile == profile,
            Transaction.type == "DESPESA",
            Transaction.status != "CANCELADO",
            Transaction.is_invoice_payment == 0,
            Transaction.due_date.startswith(month_str)
        )
        .group_by(Transaction.payment_method_id, PaymentMethod.name)
        .order_by(desc("total_cents"))
    )
    pm_rows = (await db.execute(pm_q)).all()
    pm_dist = [
        PaymentMethodDistribution(
            payment_method_id=pm_id,
            name=pm_name or "Não Informado / Outros",
            amount_cents=pm_total,
            percentage=round((pm_total / total_expenses_month) * 100, 1) if total_expenses_month > 0 else 0.0,
            count=pm_count
        )
        for pm_id, pm_name, pm_total, pm_count in pm_rows
    ]

    # 11. Metas Ativas
    goals_q = select(Goal).where(Goal.profile == profile, Goal.status != "CANCELADA").order_by(Goal.created_at.desc())
    goals = (await db.execute(goals_q)).scalars().all()
    goals_summary = [
        GoalSummaryItem(
            id=g.id,
            title=g.title,
            target_amount_cents=g.target_amount_cents,
            current_amount_cents=g.current_amount_cents,
            percentage=round((g.current_amount_cents / g.target_amount_cents) * 100, 1) if g.target_amount_cents > 0 else 0.0,
            target_date=g.target_date,
            status=g.status
        )
        for g in goals
    ]

    return DashboardSummaryResponse(
        profile=profile,
        month=month,
        year=year,
        income_realized_cents=inc_real,
        expense_realized_cents=exp_real,
        net_realized_cents=(inc_real - exp_real),
        savings_rate=savings_rate,
        income_pending_cents=inc_pend,
        expense_pending_cents=exp_pend,
        net_pending_cents=(inc_pend - exp_pend),
        projected_net_cents=(inc_real + inc_pend) - (exp_real + exp_pend),
        overdue_count=overdue_count,
        overdue_amount_cents=overdue_amount,
        due_today_count=due_today_count,
        due_today_amount_cents=due_today_amount,
        total_account_balance_cents=total_acc_balance,
        total_credit_card_invoices_cents=total_card_invoices,
        total_debts_remaining_cents=total_debts,
        net_worth_cents=net_worth,
        accounts_balances=accounts_balances,
        historical_trend=historical_trend,
        nature_breakdown=nature_breakdown,
        top_expense_categories=categories_breakdown,
        budgets_summary=budgets_summary,
        upcoming_7_days=upcoming_7_days,
        payment_methods_distribution=pm_dist,
        goals_summary=goals_summary
    )
