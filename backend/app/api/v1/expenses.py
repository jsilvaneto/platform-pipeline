from collections.abc import Sequence
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseFilter,
    ExpenseStatus,
    EssentialityType,
)
from app.services import expense_service

router = APIRouter(prefix="/expenses", tags=["Despesas Pessoais"])

@router.get("/", response_model=list[ExpenseResponse])
async def list_expenses(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$", description="Filtrar por mês de competência (YYYY-MM)"),
    status_filter: ExpenseStatus | None = Query(default=None, alias="status", description="Filtrar por status"),
    category_id: str | None = Query(default=None, description="Filtrar por ID da categoria"),
    item_id: str | None = Query(default=None, description="Filtrar por ID do item"),
    contact_id: str | None = Query(default=None, description="Filtrar por ID do contato"),
    payment_method_id: str | None = Query(default=None, description="Filtrar por forma de pagamento"),
    essentiality: EssentialityType | None = Query(default=None, description="Filtrar por essencialidade"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Sequence[ExpenseResponse]:
    """Lista despesas pessoais com filtros avançados."""
    filters = ExpenseFilter(
        month=month,
        status=status_filter,
        category_id=category_id,
        item_id=item_id,
        contact_id=contact_id,
        payment_method_id=payment_method_id,
        essentiality=essentiality,
    )
    return await expense_service.list_expenses(db, current_user.id, filters)

@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseResponse:
    """Cria uma nova despesa e gera automaticamente suas parcelas e vencimentos."""
    return await expense_service.create_expense(db, current_user.id, data)

@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseResponse:
    """Obtém detalhes de uma despesa e suas parcelas."""
    return await expense_service.get_expense(db, current_user.id, expense_id)

@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseResponse:
    """Atualiza dados cadastrais de uma despesa."""
    return await expense_service.update_expense(db, current_user.id, expense_id, data)

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Remove uma despesa e todas as parcelas associadas."""
    await expense_service.delete_expense(db, current_user.id, expense_id)
