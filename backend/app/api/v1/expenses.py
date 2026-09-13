from collections.abc import Sequence
from fastapi import APIRouter, Depends, Query, Response, status
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
    response: Response,
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$", description="Filtrar por mês de competência (YYYY-MM)"),
    status_filter: ExpenseStatus | None = Query(default=None, alias="status", description="Filtrar por status"),
    category_id: str | None = Query(default=None, description="Filtrar por ID da categoria"),
    item_id: str | None = Query(default=None, description="Filtrar por ID do item"),
    contact_id: str | None = Query(default=None, description="Filtrar por ID do contato"),
    payment_method_id: str | None = Query(default=None, description="Filtrar por forma de pagamento"),
    essentiality: EssentialityType | None = Query(default=None, description="Filtrar por essencialidade"),
    page: int | None = Query(default=None, ge=1, description="Número da página (1-based)"),
    page_size: int | None = Query(default=None, ge=1, le=100, description="Quantidade de registros por página"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Sequence[ExpenseResponse]:
    """Lista despesas pessoais com filtros avançados e paginação."""
    filters = ExpenseFilter(
        month=month,
        status=status_filter,
        category_id=category_id,
        item_id=item_id,
        contact_id=contact_id,
        payment_method_id=payment_method_id,
        essentiality=essentiality,
    )
    items, total_count = await expense_service.list_expenses(
        db, current_user.id, filters, page=page, page_size=page_size
    )

    current_page = page or 1
    current_size = page_size or (len(items) if len(items) > 0 else 1)
    total_pages = max(1, (total_count + current_size - 1) // current_size) if total_count > 0 else 1

    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Page"] = str(current_page)
    response.headers["X-Page-Size"] = str(current_size)
    response.headers["X-Total-Pages"] = str(total_pages)

    return items

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
