import calendar
from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment
from app.models.expense import Expense
from app.schemas.calendar import (
    CalendarPaymentItem,
    CalendarDay,
    CalendarMonthResponse,
)
from app.services.expense_service import ensure_recurring_horizon

MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

async def get_calendar_month(
    db: AsyncSession,
    user_id: str,
    month: str,
) -> CalendarMonthResponse:
    """Retorna os dados do calendário financeiro mensal com grade completa de semanas."""
    year, month_num = map(int, month.split("-"))

    # Garante geração de despesas recorrentes para o ano selecionado
    await ensure_recurring_horizon(db, user_id, target_year=year)

    today = date.today()
    today_str = today.isoformat()

    first_day = date(year, month_num, 1)
    _, num_days = calendar.monthrange(year, month_num)
    last_day = date(year, month_num, num_days)

    # Grade padrão Domingo a Sábado
    # weekday() do python: 0=Segunda ... 6=Domingo
    # sun_weekday: 0=Domingo, 1=Segunda ... 6=Sábado
    leading_days = (first_day.weekday() + 1) % 7
    grid_start = first_day - timedelta(days=leading_days)

    trailing_days = (6 - ((last_day.weekday() + 1) % 7))
    grid_end = last_day + timedelta(days=trailing_days)

    # Busca parcelas com vencimento dentro da janela da grade
    query = (
        select(Payment)
        .join(Payment.expense)
        .options(
            selectinload(Payment.expense).selectinload(Expense.category),
            selectinload(Payment.expense).selectinload(Expense.contact),
        )
        .where(
            Payment.user_id == user_id,
            Payment.due_date >= grid_start.isoformat(),
            Payment.due_date <= grid_end.isoformat(),
            Payment.status != "CANCELADO",
        )
        .order_by(Payment.due_date.asc(), Payment.installment_number.asc())
    )
    result = await db.execute(query)
    payments = result.scalars().all()

    # Mapeia pagamentos por data
    payments_by_date: dict[str, list[CalendarPaymentItem]] = {}
    for p in payments:
        is_overdue = (p.status == "PENDENTE" and p.due_date < today_str)
        inst_text = (
            "Recorrente"
            if p.expense.is_recurring
            else (
                f"{p.installment_number}/{p.expense.installments_count}"
                if p.expense.installments_count > 1
                else "À vista"
            )
        )

        item = CalendarPaymentItem(
            payment_id=p.id,
            expense_id=p.expense_id,
            description=p.expense.description,
            installment_text=inst_text,
            amount_cents=p.amount_cents,
            due_date=p.due_date,
            status=p.status,
            paid_at=p.paid_at,
            is_recurring=p.expense.is_recurring,
            is_overdue=is_overdue,
            category_name=p.expense.category.name if p.expense.category else "Geral",
            category_color=p.expense.category.color if p.expense.category else "#6366f1",
            category_icon=p.expense.category.icon if p.expense.category else "Tag",
            contact_name=p.expense.contact.name if p.expense.contact else None,
        )

        if p.due_date not in payments_by_date:
            payments_by_date[p.due_date] = []
        payments_by_date[p.due_date].append(item)

    # Constrói os dias da grade
    days: list[CalendarDay] = []
    current_date = grid_start

    month_total_cents = 0
    month_paid_cents = 0
    month_pending_cents = 0
    month_overdue_cents = 0

    peak_day: str | None = None
    peak_day_amount_cents = 0

    while current_date <= grid_end:
        d_str = current_date.isoformat()
        is_curr_month = (current_date.month == month_num and current_date.year == year)
        is_tod = (d_str == today_str)
        weekday_idx = (current_date.weekday() + 1) % 7

        day_payments = payments_by_date.get(d_str, [])
        d_total = sum(item.amount_cents for item in day_payments)
        d_paid = sum(item.amount_cents for item in day_payments if item.status == "CONCLUIDO")
        d_pending = sum(item.amount_cents for item in day_payments if item.status == "PENDENTE")
        d_overdue = sum(item.amount_cents for item in day_payments if item.is_overdue)
        has_overdue = any(item.is_overdue for item in day_payments)

        if is_curr_month:
            month_total_cents += d_total
            month_paid_cents += d_paid
            month_pending_cents += d_pending
            month_overdue_cents += d_overdue

            if d_total > peak_day_amount_cents:
                peak_day_amount_cents = d_total
                peak_day = d_str

        days.append(
            CalendarDay(
                date=d_str,
                day=current_date.day,
                weekday=weekday_idx,
                weekday_name=WEEKDAY_SHORT[weekday_idx],
                is_current_month=is_curr_month,
                is_today=is_tod,
                total_cents=d_total,
                paid_cents=d_paid,
                pending_cents=d_pending,
                overdue_cents=d_overdue,
                has_overdue=has_overdue,
                payments=day_payments,
            )
        )
        current_date += timedelta(days=1)

    return CalendarMonthResponse(
        month=month,
        year=year,
        month_num=month_num,
        month_name=MONTH_NAMES[month_num - 1],
        total_cents=month_total_cents,
        paid_cents=month_paid_cents,
        pending_cents=month_pending_cents,
        overdue_cents=month_overdue_cents,
        peak_day=peak_day,
        peak_day_amount_cents=peak_day_amount_cents,
        days=days,
    )
