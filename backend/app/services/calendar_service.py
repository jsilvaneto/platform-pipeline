import calendar
from datetime import date, datetime, timedelta
from typing import Optional
from dateutil.rrule import rrulestr
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment
from app.models.expense import Expense
from app.models.wallet_record import WalletRecord
from app.models.wallet_standing_order import WalletStandingOrder
from app.schemas.calendar import (
    CalendarPaymentItem,
    CalendarDay,
    CalendarMonthResponse,
)
from app.services.expense_service import ensure_recurring_horizon

MONTH_NAMES: list[str] = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

WEEKDAY_SHORT: list[str] = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]


async def get_calendar_month(
    db: AsyncSession,
    user_id: str,
    month: str,
) -> CalendarMonthResponse:
    """Retorna os dados do calendário financeiro mensal com grade completa de semanas a partir de despesas locais e da Wallet API."""
    year, month_num = map(int, month.split("-"))
    today = date.today()
    today_str = today.isoformat()

    # Garante geração de despesas recorrentes manuais para o ano selecionado
    await ensure_recurring_horizon(db, user_id, target_year=year)

    first_day = date(year, month_num, 1)
    _, num_days = calendar.monthrange(year, month_num)
    last_day = date(year, month_num, num_days)

    leading_days = (first_day.weekday() + 1) % 7
    grid_start = first_day - timedelta(days=leading_days)

    trailing_days = (6 - ((last_day.weekday() + 1) % 7))
    grid_end = last_day + timedelta(days=trailing_days)

    grid_start_str = grid_start.isoformat()
    grid_end_str = grid_end.isoformat()

    payments_by_date: dict[str, list[CalendarPaymentItem]] = {}

    # 1. Busca Payment (despesas locais/manuais)
    pay_query = (
        select(Payment)
        .join(Payment.expense)
        .options(
            selectinload(Payment.expense).selectinload(Expense.category),
            selectinload(Payment.expense).selectinload(Expense.contact),
        )
        .where(
            Payment.user_id == user_id,
            Payment.due_date >= grid_start_str,
            Payment.due_date <= grid_end_str,
            Payment.status != "CANCELADO",
        )
        .order_by(Payment.due_date.asc(), Payment.installment_number.asc())
    )
    pay_res = await db.execute(pay_query)
    payments = pay_res.scalars().all()
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

    # 2. Busca WalletRecord (despesas realizadas/conferidas sincronizadas)
    rec_query = (
        select(WalletRecord)
        .options(
            selectinload(WalletRecord.category),
            selectinload(WalletRecord.account),
        )
        .where(
            WalletRecord.user_id == user_id,
            WalletRecord.record_type == "DESPESA",
            WalletRecord.record_date >= grid_start_str,
            WalletRecord.record_date <= f"{grid_end_str}T23:59:59",
        )
        .order_by(WalletRecord.record_date.asc())
    )
    rec_res = await db.execute(rec_query)
    records = rec_res.scalars().all()
    for r in records:
        d_str = r.record_date[:10]
        desc = r.note or r.counter_party or "Despesa"
        is_cleared = r.record_state in ("reconciled", "cleared")
        status = "CONCLUIDO" if is_cleared else "PENDENTE"
        is_overdue = (status == "PENDENTE" and d_str < today_str)

        item = CalendarPaymentItem(
            payment_id=r.id,
            expense_id=r.id,
            description=desc,
            installment_text="Extrato" if r.source == "bank-sync" else "À vista",
            amount_cents=r.amount_cents,
            due_date=d_str,
            status=status,
            paid_at=r.record_date if is_cleared else None,
            is_recurring=False,
            is_overdue=is_overdue,
            category_name=r.category.name if r.category else "Geral",
            category_color=r.category.color if r.category and r.category.color else "#6366f1",
            category_icon=r.category.icon if r.category and r.category.icon else "Tag",
            contact_name=r.counter_party or (r.account.name if r.account else None),
        )
        if d_str not in payments_by_date:
            payments_by_date[d_str] = []
        payments_by_date[d_str].append(item)

    # 2. Busca WalletStandingOrder para compromissos futuros agendados
    so_query = (
        select(WalletStandingOrder)
        .options(
            selectinload(WalletStandingOrder.category),
            selectinload(WalletStandingOrder.account),
        )
        .where(
            WalletStandingOrder.user_id == user_id,
            WalletStandingOrder.is_active == True,  # noqa: E712
            WalletStandingOrder.record_type != "RECEITA",
        )
    )
    so_res = await db.execute(so_query)
    standing_orders = so_res.scalars().all()

    for so in standing_orders:
        occurrences: list[date] = []
        if so.recurrence_rule:
            try:
                base_dt = date.fromisoformat(so.due_date) if so.due_date else today
                rule_obj = rrulestr(
                    so.recurrence_rule,
                    dtstart=datetime.combine(base_dt, datetime.min.time()),
                )
                dt_list = rule_obj.between(
                    datetime.combine(grid_start, datetime.min.time()),
                    datetime.combine(grid_end, datetime.max.time()),
                    inc=True,
                )
                occurrences = [d.date() for d in dt_list]
            except Exception:
                cur_d = date.fromisoformat(so.due_date) if so.due_date else today
                while cur_d <= grid_end:
                    if cur_d >= grid_start:
                        occurrences.append(cur_d)
                    cur_d = (cur_d.replace(day=1) + timedelta(days=32)).replace(day=min(cur_d.day, 28))

        for occ_date in occurrences:
            d_str = occ_date.isoformat()
            if occ_date >= today:
                so_item = CalendarPaymentItem(
                    payment_id=f"so_{so.id}_{d_str}",
                    expense_id=so.id,
                    description=so.name,
                    installment_text="Recorrente",
                    amount_cents=so.amount_cents,
                    due_date=d_str,
                    status="PENDENTE",
                    paid_at=None,
                    is_recurring=True,
                    is_overdue=False,
                    category_name=so.category.name if so.category else "Geral",
                    category_color=so.category.color if so.category and so.category.color else "#6366f1",
                    category_icon=so.category.icon if so.category and so.category.icon else "Tag",
                    contact_name=so.account.name if so.account else None,
                )
                if d_str not in payments_by_date:
                    payments_by_date[d_str] = []
                payments_by_date[d_str].append(so_item)

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
