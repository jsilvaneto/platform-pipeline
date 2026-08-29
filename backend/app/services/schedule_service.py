import calendar
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Schedule, Transaction, CreditCard
from app.schemas.schedule import ScheduleCreate
from app.services.credit_card_service import calculate_invoice_period_and_due_date

def calculate_next_date(base_date: date, frequency: str, step: int, fixed_day: int) -> date:
    """Calcula a data futura respeitando a frequência e o dia de vencimento."""
    if frequency == "SEMANAL":
        from datetime import timedelta
        return base_date + timedelta(weeks=step)
    
    # Cálculo em meses para mensal, trimestral, semestral e anual
    month_increments = {
        "MENSAL": 1,
        "TRIMESTRAL": 3,
        "SEMESTRAL": 6,
        "ANUAL": 12
    }
    months_to_add = month_increments.get(frequency, 1) * step
    
    total_month = base_date.month - 1 + months_to_add
    year = base_date.year + total_month // 12
    month = total_month % 12 + 1
    max_day = calendar.monthrange(year, month)[1]
    day = min(fixed_day, max_day)
    
    return date(year, month, day)

async def create_schedule_with_transactions(db: AsyncSession, schedule_in: ScheduleCreate) -> Schedule:
    # 1. Cria o registro mestre do plano
    schedule_data = schedule_in.model_dump()
    for fk in ["account_id", "credit_card_id", "item_id", "contact_id", "debt_id", "payment_method_id"]:
        if fk in schedule_data and schedule_data[fk] == "":
            schedule_data[fk] = None
    new_schedule = Schedule(**schedule_data)
    db.add(new_schedule)
    await db.flush() # Obtém o ID do schedule

    # 2. Converte a data inicial
    start_dt = datetime.strptime(schedule_in.start_date, "%Y-%m-%d").date()
    
    # Se vinculado a cartão de crédito, busca dados do cartão para cálculo de faturas
    card: Optional[CreditCard] = None
    base_inv_m: Optional[int] = None
    base_inv_y: Optional[int] = None
    if schedule_in.credit_card_id:
        card = await db.get(CreditCard, schedule_in.credit_card_id)
        if card:
            base_inv_m, base_inv_y, _, _, _ = calculate_invoice_period_and_due_date(
                start_dt, card.closing_day, card.due_day
            )

    # 3. Determina quantas transações materializar
    if schedule_in.schedule_type == "PARCELADA":
        count = schedule_in.total_installments or 1
    else:
        # Recorrente contínua gera os próximos 12 lançamentos de projeção
        count = 12

    # 4. Cria as transações
    for i in range(count):
        inst_number = (i + 1) if schedule_in.schedule_type == "PARCELADA" else None
        total_inst = schedule_in.total_installments if schedule_in.schedule_type == "PARCELADA" else None
        
        inv_month: Optional[int] = None
        inv_year: Optional[int] = None

        if card and base_inv_m is not None and base_inv_y is not None:
            # Distribui sucessivamente pelas faturas futuras
            tot_m = (base_inv_m - 1) + i
            inv_year = base_inv_y + tot_m // 12
            inv_month = tot_m % 12 + 1
            dummy_dt = date(inv_year, inv_month, 1)
            _, _, _, _, due_str = calculate_invoice_period_and_due_date(
                dummy_dt, card.closing_day, card.due_day
            )
            due_iso = due_str
        else:
            due_dt = calculate_next_date(start_dt, schedule_in.frequency, i, schedule_in.due_day)
            due_iso = due_dt.isoformat()
        
        desc = schedule_in.description
        if schedule_in.schedule_type == "PARCELADA":
            desc = f"{schedule_in.description} ({inst_number}/{total_inst})"

        trans = Transaction(
            profile=new_schedule.profile,
            type=new_schedule.type,
            account_id=new_schedule.account_id,
            credit_card_id=new_schedule.credit_card_id,
            category_id=new_schedule.category_id,
            item_id=new_schedule.item_id,
            contact_id=new_schedule.contact_id,
            debt_id=new_schedule.debt_id,
            payment_method_id=new_schedule.payment_method_id,
            schedule_id=new_schedule.id,
            invoice_month=inv_month,
            invoice_year=inv_year,
            installment_number=inst_number,
            total_installments=total_inst,
            description=desc,
            amount_cents=new_schedule.amount_cents,
            due_date=due_iso,
            status="PENDENTE",
            sync_status="PENDENTE"
        )
        db.add(trans)

    await db.commit()

    # Se vinculado a cartão de crédito, sincroniza as faturas geradas
    if card and base_inv_m is not None and base_inv_y is not None:
        from app.services.credit_card_service import sync_card_invoice_transaction
        for i in range(count):
            tot_m = (base_inv_m - 1) + i
            iy = base_inv_y + tot_m // 12
            im = tot_m % 12 + 1
            await sync_card_invoice_transaction(db, card.id, iy, im)
        await db.commit()

    await db.refresh(new_schedule)
    return new_schedule
