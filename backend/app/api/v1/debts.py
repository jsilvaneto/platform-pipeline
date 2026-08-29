from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.models import Debt, User
from app.schemas.debt import DebtCreate, DebtUpdate, DebtResponse
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/debts", tags=["Dívidas"])

@router.get("", response_model=List[DebtResponse])
async def list_debts(
    profile: Optional[str] = Query(None, description="Filtrar por PESSOAL ou EMPRESA"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filtrar por status"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Debt)
    if profile:
        query = query.where(Debt.profile == profile)
    if status_filter:
        query = query.where(Debt.status == status_filter)
    query = query.order_by(Debt.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=DebtResponse, status_code=status.HTTP_201_CREATED)
async def create_debt(
    debt_in: DebtCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    data = debt_in.model_dump()
    if data.get("remaining_amount_cents") is None:
        data["remaining_amount_cents"] = data["total_amount_cents"]
        
    new_debt = Debt(**data)
    db.add(new_debt)
    await db.commit()
    await db.refresh(new_debt)
    return new_debt

@router.put("/{debt_id}", response_model=DebtResponse)
async def update_debt(
    debt_id: str,
    debt_in: DebtUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Debt).where(Debt.id == debt_id)
    result = await db.execute(query)
    debt = result.scalar_one_or_none()
    if not debt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dívida não encontrada")
    
    update_data = debt_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(debt, field, value)
        
    if debt.remaining_amount_cents == 0:
        debt.status = "QUITADA"
    
    await db.commit()
    await db.refresh(debt)
    return debt

@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_debt(
    debt_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Debt).where(Debt.id == debt_id)
    result = await db.execute(query)
    debt = result.scalar_one_or_none()
    if not debt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dívida não encontrada")
    await db.delete(debt)
    await db.commit()
