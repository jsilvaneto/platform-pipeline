from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, update
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date

from app.database import get_db
from app.models import Schedule, Transaction, User, Category, Account, CreditCard, PaymentMethod, Contact
from app.schemas.schedule import (
    ScheduleCreate, ScheduleUpdate, ScheduleAdjust, ScheduleAction, ScheduleResponse
)
from app.services.schedule_service import create_schedule_with_transactions
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/schedules", tags=["Pagamentos Planejados & Recorrências"])

async def build_schedule_response(s: Schedule, db: AsyncSession) -> ScheduleResponse:
    # 1. Carrega estatísticas de transações vinculadas
    trans_query = select(Transaction).where(Transaction.schedule_id == s.id)
    trans_res = await db.execute(trans_query)
    transactions = trans_res.scalars().all()

    paid_count = 0
    pending_count = 0
    paid_cents = 0
    pending_cents = 0
    next_due: Optional[str] = None
    pending_due_dates = []

    for t in transactions:
        if t.status == "CONCLUIDO":
            paid_count += 1
            paid_cents += t.amount_cents
        elif t.status == "PENDENTE":
            pending_count += 1
            pending_cents += t.amount_cents
            if t.due_date:
                pending_due_dates.append(t.due_date)

    if pending_due_dates:
        pending_due_dates.sort()
        next_due = pending_due_dates[0]

    return ScheduleResponse(
        id=s.id,
        profile=s.profile, # type: ignore
        type=s.type, # type: ignore
        account_id=s.account_id,
        credit_card_id=s.credit_card_id,
        category_id=s.category_id,
        item_id=s.item_id,
        contact_id=s.contact_id,
        debt_id=s.debt_id,
        payment_method_id=s.payment_method_id,
        description=s.description,
        schedule_type=s.schedule_type, # type: ignore
        frequency=s.frequency, # type: ignore
        amount_cents=s.amount_cents,
        total_installments=s.total_installments,
        start_date=s.start_date,
        due_day=s.due_day,
        status=s.status, # type: ignore
        created_at=s.created_at,
        category_name=s.category.name if s.category else None,
        account_name=s.account.name if getattr(s, "account", None) else None,
        credit_card_name=s.credit_card.name if getattr(s, "credit_card", None) else None,
        payment_method_name=s.payment_method.name if getattr(s, "payment_method", None) else None,
        contact_name=s.contact.name if getattr(s, "contact", None) else None,
        paid_count=paid_count,
        pending_count=pending_count,
        paid_amount_cents=paid_cents,
        pending_amount_cents=pending_cents,
        next_due_date=next_due
    )

@router.get("", response_model=List[ScheduleResponse])
async def list_schedules(
    profile: Optional[str] = Query(None, description="Filtrar por PESSOAL ou EMPRESA"),
    status_filter: Optional[str] = Query(None, alias="status"),
    schedule_type: Optional[str] = Query(None, description="RECORRENTE_CONTINUA ou PARCELADA"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Schedule).options(
        selectinload(Schedule.category),
        selectinload(Schedule.contact),
        selectinload(Schedule.credit_card),
        selectinload(Schedule.payment_method),
    )
    if profile:
        query = query.where(Schedule.profile == profile)
    if status_filter:
        query = query.where(Schedule.status == status_filter)
    if schedule_type:
        query = query.where(Schedule.schedule_type == schedule_type)
    
    query = query.order_by(Schedule.created_at.desc())
    result = await db.execute(query)
    schedules = result.scalars().all()

    # Preenche nomes de contas manualmente se houver account_id
    responses = []
    for s in schedules:
        resp = await build_schedule_response(s, db)
        if s.account_id:
            acc = await db.get(Account, s.account_id)
            if acc:
                resp.account_name = acc.name
        responses.append(resp)

    return responses

@router.post("", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule_in: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    if schedule_in.schedule_type == "PARCELADA" and not schedule_in.total_installments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Planos parcelados exigem a quantidade total de parcelas (total_installments)"
        )
    schedule = await create_schedule_with_transactions(db, schedule_in)
    return await build_schedule_response(schedule, db)

@router.post("/{schedule_id}/adjust", response_model=ScheduleResponse)
async def adjust_schedule(
    schedule_id: str,
    payload: ScheduleAdjust,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Reajusta valor, dia de vencimento ou descrição de um plano e aplica automaticamente aos lançamentos futuros pendentes."""
    schedule = await db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato/Recorrência não encontrado")

    if payload.new_amount_cents is not None:
        schedule.amount_cents = payload.new_amount_cents
    if payload.new_due_day is not None:
        schedule.due_day = payload.new_due_day
    if payload.new_description is not None:
        schedule.description = payload.new_description

    # Atualiza lançamentos futuros pendentes vinculados
    trans_query = select(Transaction).where(
        Transaction.schedule_id == schedule_id,
        Transaction.status == "PENDENTE"
    )
    res = await db.execute(trans_query)
    pending_transactions = res.scalars().all()

    for t in pending_transactions:
        if payload.new_amount_cents is not None:
            t.amount_cents = payload.new_amount_cents
        
        if payload.new_description is not None:
            if schedule.schedule_type == "PARCELADA" and t.installment_number and t.total_installments:
                t.description = f"{payload.new_description} ({t.installment_number}/{t.total_installments})"
            else:
                t.description = payload.new_description

        if payload.new_due_day is not None and t.due_date and not t.credit_card_id:
            try:
                dt = datetime.strptime(t.due_date, "%Y-%m-%d").date()
                import calendar
                max_d = calendar.monthrange(dt.year, dt.month)[1]
                target_d = min(payload.new_due_day, max_d)
                new_dt = date(dt.year, dt.month, target_d)
                t.due_date = new_dt.isoformat()
            except Exception:
                pass

    await db.commit()
    await db.refresh(schedule)
    return await build_schedule_response(schedule, db)

@router.post("/{schedule_id}/action", response_model=ScheduleResponse)
async def perform_schedule_action(
    schedule_id: str,
    payload: ScheduleAction,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Executa ações de ciclo de vida (PAUSAR, REATIVAR ou CANCELAR com exclusão de parcelas futuras)."""
    schedule = await db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato/Recorrência não encontrado")

    if payload.action == "PAUSAR":
        schedule.status = "PAUSADO"
    elif payload.action == "REATIVAR":
        schedule.status = "ATIVO"
    elif payload.action == "CANCELAR":
        schedule.status = "CANCELADO"
        # Remove todos os lançamentos futuros pendentes, preservando os já concluídos
        await db.execute(
            delete(Transaction).where(
                Transaction.schedule_id == schedule_id,
                Transaction.status == "PENDENTE"
            )
        )

    await db.commit()
    await db.refresh(schedule)
    return await build_schedule_response(schedule, db)

@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: str,
    schedule_in: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    schedule = await db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plano não encontrado")
    
    update_data = schedule_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)
    
    await db.commit()
    await db.refresh(schedule)
    return await build_schedule_response(schedule, db)

@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    schedule = await db.get(Schedule, schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plano não encontrado")
    
    # Exclui transações pendentes vinculadas
    await db.execute(
        delete(Transaction).where(
            Transaction.schedule_id == schedule_id,
            Transaction.status == "PENDENTE"
        )
    )
    await db.delete(schedule)
    await db.commit()
