from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.models import PaymentMethod, User
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate, PaymentMethodResponse
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/payment-methods", tags=["Formas de Pagamento"])

@router.get("", response_model=List[PaymentMethodResponse])
async def list_payment_methods(
    profile: Optional[str] = Query(None, description="Filtrar por PESSOAL ou EMPRESA"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(PaymentMethod)
    if profile:
        query = query.where(PaymentMethod.profile == profile)
    query = query.order_by(PaymentMethod.name.asc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_method(
    pm_in: PaymentMethodCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    new_pm = PaymentMethod(**pm_in.model_dump())
    db.add(new_pm)
    await db.commit()
    await db.refresh(new_pm)
    return new_pm

@router.get("/{pm_id}", response_model=PaymentMethodResponse)
async def get_payment_method(
    pm_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(PaymentMethod).where(PaymentMethod.id == pm_id)
    result = await db.execute(query)
    pm = result.scalar_one_or_none()
    if not pm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forma de pagamento não encontrada")
    return pm

@router.put("/{pm_id}", response_model=PaymentMethodResponse)
async def update_payment_method(
    pm_id: str,
    pm_in: PaymentMethodUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(PaymentMethod).where(PaymentMethod.id == pm_id)
    result = await db.execute(query)
    pm = result.scalar_one_or_none()
    if not pm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forma de pagamento não encontrada")
    
    update_data = pm_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pm, field, value)
    
    await db.commit()
    await db.refresh(pm)
    return pm

@router.delete("/{pm_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment_method(
    pm_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(PaymentMethod).where(PaymentMethod.id == pm_id)
    result = await db.execute(query)
    pm = result.scalar_one_or_none()
    if not pm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forma de pagamento não encontrada")
    
    await db.delete(pm)
    await db.commit()
