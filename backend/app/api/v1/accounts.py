from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.models import Account, User
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/accounts", tags=["Contas e Carteiras"])

@router.get("", response_model=List[AccountResponse])
async def list_accounts(
    profile: Optional[str] = Query(None, description="Filtrar por PESSOAL ou EMPRESA"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Account)
    if profile:
        query = query.where(Account.profile == profile)
    query = query.order_by(Account.name.asc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_in: AccountCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    new_account = Account(**account_in.model_dump())
    db.add(new_account)
    await db.commit()
    await db.refresh(new_account)
    return new_account

@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Account).where(Account.id == account_id)
    result = await db.execute(query)
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrada")
    return account

@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    account_in: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Account).where(Account.id == account_id)
    result = await db.execute(query)
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrada")
    
    update_data = account_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
    
    await db.commit()
    await db.refresh(account)
    return account

@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Account).where(Account.id == account_id)
    result = await db.execute(query)
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrada")
    
    await db.delete(account)
    await db.commit()
