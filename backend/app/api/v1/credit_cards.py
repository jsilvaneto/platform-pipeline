from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import CreditCard, Account, User
from app.schemas.credit_card import (
    CreditCardCreate,
    CreditCardUpdate,
    CreditCardResponse,
    CreditCardInvoiceSummary,
    CreditCardInvoiceDetail,
    CreditCardInvoiceSettleRequest,
    CreditCardInvoiceSettleResponse
)
from app.api.v1.deps import get_current_user
from app.services.credit_card_service import (
    calculate_card_limits,
    get_card_invoices_summary,
    get_invoice_detail,
    settle_card_invoice,
    unsettle_card_invoice
)

router = APIRouter(prefix="/credit-cards", tags=["Cartões de Crédito & Faturas"])

@router.get("", response_model=List[CreditCardResponse])
async def list_credit_cards(
    profile: str = Query(..., description="PESSOAL ou EMPRESA"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = (
        select(CreditCard, Account.name.label("account_name"))
        .outerjoin(Account, CreditCard.account_id == Account.id)
        .where(CreditCard.profile == profile)
        .order_by(CreditCard.name.asc())
    )
    results = (await db.execute(query)).all()

    response_list = []
    for card, acc_name in results:
        used, avail, cur_inv = await calculate_card_limits(db, card)
        response_list.append(CreditCardResponse(
            id=card.id,
            profile=card.profile, # type: ignore
            name=card.name,
            limit_cents=card.limit_cents,
            used_limit_cents=used,
            available_limit_cents=avail,
            current_invoice_cents=cur_inv,
            closing_day=card.closing_day,
            due_day=card.due_day,
            color=card.color,
            brand=card.brand,
            account_id=card.account_id,
            account_name=acc_name,
            created_at=card.created_at
        ))

    return response_list

@router.post("", response_model=CreditCardResponse, status_code=status.HTTP_201_CREATED)
async def create_credit_card(
    card_in: CreditCardCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    if card_in.account_id:
        acc = await db.get(Account, card_in.account_id)
        if not acc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conta bancária vinculada não encontrada."
            )

    new_card = CreditCard(**card_in.model_dump())
    db.add(new_card)
    await db.commit()
    await db.refresh(new_card)

    acc_name = None
    if new_card.account_id:
        acc = await db.get(Account, new_card.account_id)
        acc_name = acc.name if acc else None

    return CreditCardResponse(
        id=new_card.id,
        profile=new_card.profile, # type: ignore
        name=new_card.name,
        limit_cents=new_card.limit_cents,
        used_limit_cents=0,
        available_limit_cents=new_card.limit_cents,
        current_invoice_cents=0,
        closing_day=new_card.closing_day,
        due_day=new_card.due_day,
        color=new_card.color,
        brand=new_card.brand,
        account_id=new_card.account_id,
        account_name=acc_name,
        created_at=new_card.created_at
    )

@router.get("/{card_id}", response_model=CreditCardResponse)
async def get_credit_card(
    card_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    card = await db.get(CreditCard, card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartão de crédito não encontrado."
        )

    acc_name = None
    if card.account_id:
        acc = await db.get(Account, card.account_id)
        acc_name = acc.name if acc else None

    used, avail, cur_inv = await calculate_card_limits(db, card)
    return CreditCardResponse(
        id=card.id,
        profile=card.profile, # type: ignore
        name=card.name,
        limit_cents=card.limit_cents,
        used_limit_cents=used,
        available_limit_cents=avail,
        current_invoice_cents=cur_inv,
        closing_day=card.closing_day,
        due_day=card.due_day,
        color=card.color,
        brand=card.brand,
        account_id=card.account_id,
        account_name=acc_name,
        created_at=card.created_at
    )

@router.put("/{card_id}", response_model=CreditCardResponse)
async def update_credit_card(
    card_id: str,
    card_in: CreditCardUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    card = await db.get(CreditCard, card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartão de crédito não encontrado."
        )

    update_data = card_in.model_dump(exclude_unset=True)
    if "account_id" in update_data and update_data["account_id"]:
        acc = await db.get(Account, update_data["account_id"])
        if not acc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conta bancária vinculada não encontrada."
            )

    for field, val in update_data.items():
        setattr(card, field, val)

    await db.commit()
    await db.refresh(card)

    acc_name = None
    if card.account_id:
        acc = await db.get(Account, card.account_id)
        acc_name = acc.name if acc else None

    used, avail, cur_inv = await calculate_card_limits(db, card)
    return CreditCardResponse(
        id=card.id,
        profile=card.profile, # type: ignore
        name=card.name,
        limit_cents=card.limit_cents,
        used_limit_cents=used,
        available_limit_cents=avail,
        current_invoice_cents=cur_inv,
        closing_day=card.closing_day,
        due_day=card.due_day,
        color=card.color,
        brand=card.brand,
        account_id=card.account_id,
        account_name=acc_name,
        created_at=card.created_at
    )

@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_credit_card(
    card_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    card = await db.get(CreditCard, card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartão de crédito não encontrado."
        )
    await db.delete(card)
    await db.commit()

# ----------------- FATURAS (INVOICES) -----------------

@router.get("/{card_id}/invoices", response_model=List[CreditCardInvoiceSummary])
async def list_card_invoices(
    card_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    card = await db.get(CreditCard, card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartão de crédito não encontrado."
        )
    return await get_card_invoices_summary(db, card)

@router.get("/{card_id}/invoices/{year}/{month}", response_model=CreditCardInvoiceDetail)
async def get_card_invoice_detail(
    card_id: str,
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    card = await db.get(CreditCard, card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartão de crédito não encontrado."
        )
    return await get_invoice_detail(db, card, year, month)

@router.post("/{card_id}/invoices/{year}/{month}/settle", response_model=CreditCardInvoiceSettleResponse)
async def settle_invoice(
    card_id: str,
    year: int,
    month: int,
    req: CreditCardInvoiceSettleRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    card = await db.get(CreditCard, card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartão de crédito não encontrado."
        )
    return await settle_card_invoice(db, card, year, month, req)

@router.post("/{card_id}/invoices/{year}/{month}/unsettle")
async def unsettle_invoice(
    card_id: str,
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    card = await db.get(CreditCard, card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartão de crédito não encontrado."
        )
    return await unsettle_card_invoice(db, card, year, month)
