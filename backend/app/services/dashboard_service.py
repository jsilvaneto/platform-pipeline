import calendar
from datetime import date
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment
from app.models.expense import Expense
from app.schemas.dashboard import (
    DashboardMetrics,
    MonthlySpending,
    DailySpending,
    CategorySpending,
    ItemSpending,
    EssentialitySpending,
    UpcomingPayment,
    OverduePayment,
)
from app.services.expense_service import ensure_recurring_horizon

MONTH_NAMES: list[str] = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]

WEEKDAY_NAMES: list[str] = [
    "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom",
]

async def get_dashboard_metrics(
    db: AsyncSession,
    user_id: str,
    year: int | None = None,
    month: str | None = None,
) -> DashboardMetrics:
    """Calcula indicadores consolidados de despesas e pagamentos para o ano atual (ou período informado)."""
    today = date.today()
    today_str = today.isoformat()

    if month:
        target_year = int(month.split("-")[0])
        period = month
        prefix_filter = month
    else:
        target_year = year if year is not None else today.year
        period = str(target_year)
        prefix_filter = f"{target_year}-"

    # Garante que as despesas fixas recorrentes tenham os pagamentos gerados para o ano do dashboard
    await ensure_recurring_horizon(db, user_id, target_year=target_year)

    # Busca todas as parcelas do usuário no período com dados da despesa, categoria e item
    query = (
        select(Payment)
        .join(Payment.expense)
        .options(
            selectinload(Payment.expense).selectinload(Expense.category),
            selectinload(Payment.expense).selectinload(Expense.item),
        )
        .where(
            Payment.user_id == user_id,
            Payment.due_date.startswith(prefix_filter),
            Payment.status != "CANCELADO",
        )
    )
    result = await db.execute(query)
    payments = result.scalars().all()

    total_expenses_cents = sum(p.amount_cents for p in payments)
    total_paid_cents = sum(p.amount_cents for p in payments if p.status == "CONCLUIDO")
    total_pending_cents = sum(p.amount_cents for p in payments if p.status == "PENDENTE")

    # Vencidos cumulativos históricos (todas as parcelas pendentes com data anterior a hoje)
    overdue_query = (
        select(Payment)
        .join(Payment.expense)
        .options(
            selectinload(Payment.expense).selectinload(Expense.category),
            selectinload(Payment.expense).selectinload(Expense.contact),
        )
        .where(
            Payment.user_id == user_id,
            Payment.status == "PENDENTE",
            Payment.due_date < today_str,
        )
        .order_by(Payment.due_date.asc())
    )
    overdue_res = await db.execute(overdue_query)
    overdue_payments_db = overdue_res.scalars().all()
    total_overdue_cents = sum(p.amount_cents for p in overdue_payments_db)

    overdue_payments = [
        OverduePayment(
            payment_id=p.id,
            expense_id=p.expense_id,
            description=p.expense.description,
            installment_text=f"{p.installment_number}/{p.expense.installments_count}" if p.expense.installments_count > 1 else ("Recorrente" if p.expense.is_recurring else "À vista"),
            amount_cents=p.amount_cents,
            due_date=p.due_date,
            days_overdue=max(1, (today - date.fromisoformat(p.due_date)).days),
            category_name=p.expense.category.name if p.expense.category else "Geral",
            color=p.expense.category.color if p.expense.category else "#ef4444",
            contact_name=p.expense.contact.name if p.expense.contact else None,
        )
        for p in overdue_payments_db
    ]

    monthly_breakdown: list[MonthlySpending] = []
    daily_breakdown: list[DailySpending] = []

    if month:
        # Visão Mensal: quebra por dias do mês
        year_num, month_num = int(month.split("-")[0]), int(month.split("-")[1])
        _, num_days = calendar.monthrange(year_num, month_num)

        daily_map: dict[int, dict[str, int]] = {
            d: {"total_cents": 0, "paid_cents": 0, "pending_cents": 0} for d in range(1, num_days + 1)
        }

        for p in payments:
            try:
                p_day = int(p.due_date.split("-")[2])
                if 1 <= p_day <= num_days:
                    daily_map[p_day]["total_cents"] += p.amount_cents
                    if p.status == "CONCLUIDO":
                        daily_map[p_day]["paid_cents"] += p.amount_cents
                    elif p.status == "PENDENTE":
                        daily_map[p_day]["pending_cents"] += p.amount_cents
            except (IndexError, ValueError):
                continue

        for d in range(1, num_days + 1):
            curr_date = date(year_num, month_num, d)
            daily_breakdown.append(
                DailySpending(
                    day=d,
                    date=curr_date.isoformat(),
                    weekday_name=WEEKDAY_NAMES[curr_date.weekday()],
                    total_cents=daily_map[d]["total_cents"],
                    paid_cents=daily_map[d]["paid_cents"],
                    pending_cents=daily_map[d]["pending_cents"],
                )
            )
    else:
        # Visão Anual: detalhamento mês a mês dos 12 meses do ano
        monthly_map: dict[int, dict[str, int]] = {
            m: {"total_cents": 0, "paid_cents": 0, "pending_cents": 0} for m in range(1, 13)
        }
        for p in payments:
            try:
                p_month = int(p.due_date.split("-")[1])
                if 1 <= p_month <= 12:
                    monthly_map[p_month]["total_cents"] += p.amount_cents
                    if p.status == "CONCLUIDO":
                        monthly_map[p_month]["paid_cents"] += p.amount_cents
                    elif p.status == "PENDENTE":
                        monthly_map[p_month]["pending_cents"] += p.amount_cents
            except (IndexError, ValueError):
                continue

        monthly_breakdown = [
            MonthlySpending(
                month=m,
                month_name=MONTH_NAMES[m - 1],
                total_cents=monthly_map[m]["total_cents"],
                paid_cents=monthly_map[m]["paid_cents"],
                pending_cents=monthly_map[m]["pending_cents"],
            )
            for m in range(1, 13)
        ]

    # Agrupamento por categoria
    category_map: dict[str, dict] = {}
    for p in payments:
        cat = p.expense.category
        cat_id = cat.id if cat else "sem_categoria"
        cat_name = cat.name if cat else "Sem Categoria"
        cat_color = cat.color if cat else "#9ca3af"
        cat_icon = cat.icon if cat else "Tag"

        if cat_id not in category_map:
            category_map[cat_id] = {
                "category_id": cat_id if cat_id != "sem_categoria" else None,
                "category_name": cat_name,
                "color": cat_color,
                "icon": cat_icon,
                "total_cents": 0,
            }
        category_map[cat_id]["total_cents"] += p.amount_cents

    by_category = [
        CategorySpending(
            category_id=v["category_id"],
            category_name=v["category_name"],
            color=v["color"],
            icon=v["icon"],
            total_cents=v["total_cents"],
            percentage=round((v["total_cents"] / total_expenses_cents * 100), 1) if total_expenses_cents > 0 else 0.0,
        )
        for v in category_map.values()
    ]
    by_category.sort(key=lambda x: x.total_cents, reverse=True)

    # Agrupamento por item padronizado
    item_map: dict[str, dict] = {}
    for p in payments:
        it = p.expense.item
        cat = p.expense.category
        item_id = it.id if it else "sem_item"
        item_name = it.name if it else p.expense.description
        category_name = cat.name if cat else "Geral"
        nature = it.nature if it else p.expense.essentiality

        if item_id not in item_map:
            item_map[item_id] = {
                "item_id": item_id if item_id != "sem_item" else None,
                "item_name": item_name,
                "category_name": category_name,
                "nature": nature,
                "total_cents": 0,
            }
        item_map[item_id]["total_cents"] += p.amount_cents

    by_item = [
        ItemSpending(
            item_id=v["item_id"],
            item_name=v["item_name"],
            category_name=v["category_name"],
            nature=v["nature"],
            total_cents=v["total_cents"],
            percentage=round((v["total_cents"] / total_expenses_cents * 100), 1) if total_expenses_cents > 0 else 0.0,
        )
        for v in item_map.values()
    ]
    by_item.sort(key=lambda x: x.total_cents, reverse=True)

    # Agrupamento por essencialidade
    ess_map: dict[str, int] = {
        "OBRIGATORIO": 0,
        "NECESSARIO": 0,
        "DESEJO": 0,
        "NENHUM": 0,
    }
    for p in payments:
        ess = p.expense.essentiality
        if ess in ess_map:
            ess_map[ess] += p.amount_cents

    by_essentiality = [
        EssentialitySpending(
            essentiality=k,
            total_cents=v,
            percentage=round((v / total_expenses_cents * 100), 1) if total_expenses_cents > 0 else 0.0,
        )
        for k, v in ess_map.items()
        if v > 0
    ]

    # Próximos vencimentos a partir de hoje
    upcoming_query = (
        select(Payment)
        .join(Payment.expense)
        .options(
            selectinload(Payment.expense).selectinload(Expense.category),
        )
        .where(
            Payment.user_id == user_id,
            Payment.status == "PENDENTE",
            Payment.due_date >= today_str,
        )
        .order_by(Payment.due_date.asc())
        .limit(7)
    )
    upcoming_res = await db.execute(upcoming_query)
    upcoming_payments_db = upcoming_res.scalars().all()

    upcoming_payments = [
        UpcomingPayment(
            payment_id=p.id,
            expense_id=p.expense_id,
            description=p.expense.description,
            installment_text=f"{p.installment_number}/{p.expense.installments_count}" if p.expense.installments_count > 1 else "À vista",
            amount_cents=p.amount_cents,
            due_date=p.due_date,
            category_name=p.expense.category.name if p.expense.category else "Geral",
            color=p.expense.category.color if p.expense.category else "#6366f1",
            status=p.status,
        )
        for p in upcoming_payments_db
    ]

    return DashboardMetrics(
        period=period,
        year=target_year,
        month=month,
        view_mode="monthly" if month else "annual",
        total_expenses_cents=total_expenses_cents,
        total_paid_cents=total_paid_cents,
        total_pending_cents=total_pending_cents,
        total_overdue_cents=total_overdue_cents,
        monthly_breakdown=monthly_breakdown,
        daily_breakdown=daily_breakdown,
        by_category=by_category,
        by_item=by_item,
        by_essentiality=by_essentiality,
        upcoming_payments=upcoming_payments,
        overdue_payments=overdue_payments,
    )
