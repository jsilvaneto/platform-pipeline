import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.wallet_record import WalletRecord
from app.schemas.wallet_record import (
    WalletRecordResponse,
    PaginatedRecordsResponse,
)

router = APIRouter(prefix="/records", tags=["Transações Financeiras (Records)"])


@router.get("", response_model=PaginatedRecordsResponse)
async def list_records(
    account_id: str | None = Query(default=None),
    category_id: str | None = Query(default=None),
    record_type: str | None = Query(default=None, pattern="^(RECEITA|DESPESA|TRANSFERENCIA)$"),
    record_state: str | None = Query(default=None),
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedRecordsResponse:
    """Retorna lista paginada de transações com suporte a filtros e busca textual."""
    query = (
        select(WalletRecord)
        .options(
            selectinload(WalletRecord.account),
            selectinload(WalletRecord.category),
            selectinload(WalletRecord.labels),
        )
        .where(WalletRecord.user_id == current_user.id)
    )

    if account_id:
        query = query.where(WalletRecord.account_id == account_id)
    if category_id:
        query = query.where(WalletRecord.category_id == category_id)
    if record_type:
        query = query.where(WalletRecord.record_type == record_type)
    if record_state:
        query = query.where(WalletRecord.record_state == record_state)
    if month:
        query = query.where(WalletRecord.record_date.startswith(month))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                WalletRecord.note.ilike(term),
                WalletRecord.counter_party.ilike(term),
            )
        )

    # Contagem total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.scalar(count_query)) or 0

    # Ordenação e paginação
    offset = (page - 1) * page_size
    records_query = query.order_by(WalletRecord.record_date.desc()).offset(offset).limit(page_size)
    result = await db.execute(records_query)
    records = result.scalars().all()

    items: list[WalletRecordResponse] = []
    for r in records:
        acc_name = r.account.name if r.account else "Conta Principal"
        cat_name = r.category.name if r.category else None
        cat_color = r.category.color if r.category else None
        cat_icon = r.category.icon if r.category else None
        cardinality = r.category.cardinality if r.category else "NENHUM"
        labels = [lbl.name for lbl in r.labels]

        items.append(
            WalletRecordResponse(
                id=r.id,
                user_id=r.user_id,
                account_id=r.account_id,
                account_name=acc_name,
                category_id=r.category_id,
                category_name=cat_name,
                category_color=cat_color,
                category_icon=cat_icon,
                cardinality=cardinality,
                record_type=r.record_type,
                amount_cents=r.amount_cents,
                currency_code=r.currency_code,
                converted_amount_cents=r.converted_amount_cents,
                record_date=r.record_date,
                record_state=r.record_state,
                counter_party=r.counter_party,
                note=r.note,
                source=r.source,
                is_transfer=r.is_transfer,
                transfer_id=r.transfer_id,
                labels=labels,
            )
        )

    total_pages = max(1, math.ceil(total / page_size))

    return PaginatedRecordsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
