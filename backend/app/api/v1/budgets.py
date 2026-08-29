from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from app.database import get_db
from app.models import Budget, Category, Transaction, User
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/budgets", tags=["Orçamentos"])

@router.get("", response_model=List[BudgetResponse])
async def list_budgets(
    profile: str = Query(..., description="PESSOAL ou EMPRESA"),
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    # 1. Busca orçamentos cadastrados para o mês/ano
    query = (
        select(Budget, Category.name.label("category_name"))
        .join(Category, Budget.category_id == Category.id)
        .where(
            Budget.profile == profile,
            Budget.month == month,
            Budget.year == year
        )
    )
    result = await db.execute(query)
    rows = result.all()

    month_str = f"{year:04d}-{month:02d}"
    response_list = []

    for budget, cat_name in rows:
        # 2. Calcula os gastos reais da categoria no mês (Transações de despesa não canceladas)
        spent_query = (
            select(func.coalesce(func.sum(Transaction.amount_cents), 0))
            .where(
                Transaction.profile == profile,
                Transaction.category_id == budget.category_id,
                Transaction.type == "DESPESA",
                Transaction.status != "CANCELADO",
                Transaction.due_date.startswith(month_str)
            )
        )
        spent_res = await db.execute(spent_query)
        spent_cents = spent_res.scalar() or 0

        remaining_cents = max(0, budget.limit_amount_cents - spent_cents)
        pct = round((spent_cents / budget.limit_amount_cents) * 100, 2) if budget.limit_amount_cents > 0 else 0.0

        response_list.append(BudgetResponse(
            id=budget.id,
            profile=budget.profile, # type: ignore
            category_id=budget.category_id,
            category_name=cat_name,
            month=budget.month,
            year=budget.year,
            limit_amount_cents=budget.limit_amount_cents,
            spent_amount_cents=spent_cents,
            remaining_amount_cents=remaining_cents,
            percentage_used=pct,
            created_at=budget.created_at
        ))

    return response_list

@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    budget_in: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    # Evita duplicidade de orçamento para a mesma categoria no mesmo mês
    exists_query = select(Budget).where(
        Budget.profile == budget_in.profile,
        Budget.category_id == budget_in.category_id,
        Budget.month == budget_in.month,
        Budget.year == budget_in.year
    )
    res = await db.execute(exists_query)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um orçamento configurado para esta categoria neste mês."
        )

    new_budget = Budget(**budget_in.model_dump())
    db.add(new_budget)
    await db.commit()
    await db.refresh(new_budget)

    # Busca o nome da categoria para retorno
    cat = await db.get(Category, new_budget.category_id)
    return BudgetResponse(
        id=new_budget.id,
        profile=new_budget.profile, # type: ignore
        category_id=new_budget.category_id,
        category_name=cat.name if cat else "",
        month=new_budget.month,
        year=new_budget.year,
        limit_amount_cents=new_budget.limit_amount_cents,
        spent_amount_cents=0,
        remaining_amount_cents=new_budget.limit_amount_cents,
        percentage_used=0.0,
        created_at=new_budget.created_at
    )

@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: str,
    budget_in: BudgetUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    budget = await db.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orçamento não encontrado")

    if budget_in.limit_amount_cents is not None:
        budget.limit_amount_cents = budget_in.limit_amount_cents

    await db.commit()
    await db.refresh(budget)

    cat = await db.get(Category, budget.category_id)
    return BudgetResponse(
        id=budget.id,
        profile=budget.profile, # type: ignore
        category_id=budget.category_id,
        category_name=cat.name if cat else "",
        month=budget.month,
        year=budget.year,
        limit_amount_cents=budget.limit_amount_cents,
        spent_amount_cents=0,
        remaining_amount_cents=budget.limit_amount_cents,
        percentage_used=0.0,
        created_at=budget.created_at
    )

@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    budget = await db.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orçamento não encontrado")
    await db.delete(budget)
    await db.commit()
