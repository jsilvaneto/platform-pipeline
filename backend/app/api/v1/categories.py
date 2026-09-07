from collections.abc import Sequence
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["Categorias de Despesas"])

@router.get("/", response_model=list[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Sequence[CategoryResponse]:
    """Retorna todas as categorias do usuário autenticado (com auto-seeding de categorias padrão)."""
    return await category_service.list_categories(db, current_user.id)

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> CategoryResponse:
    """Cria uma nova categoria de despesas."""
    return await category_service.create_category(db, current_user.id, data)

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> CategoryResponse:
    """Atualiza dados de uma categoria."""
    return await category_service.update_category(db, current_user.id, category_id, data)

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    """Exclui uma categoria do usuário."""
    await category_service.delete_category(db, current_user.id, category_id)
