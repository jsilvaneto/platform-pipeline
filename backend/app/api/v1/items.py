from collections.abc import Sequence
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse
from app.services import item_service

router = APIRouter(prefix="/items", tags=["Itens de Despesa"])

@router.get("/", response_model=list[ItemResponse])
async def list_items(
    category_id: str | None = Query(default=None, description="Filtrar itens por ID da categoria"),
    active_only: bool = Query(default=False, description="Filtrar apenas itens ativos"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Sequence[ItemResponse]:
    """Retorna itens cadastrados pelo usuário autenticado (com auto-seeding de itens padrão)."""
    return await item_service.list_items(
        db, current_user.id, category_id=category_id, active_only=active_only
    )

@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    data: ItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ItemResponse:
    """Cadastra um novo item vinculado a uma categoria e com natureza predefinida."""
    return await item_service.create_item(db, current_user.id, data)

@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ItemResponse:
    """Busca detalhes de um item específico."""
    return await item_service.get_item(db, current_user.id, item_id)

@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: str,
    data: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ItemResponse:
    """Atualiza dados do item (nome, categoria, natureza ou status ativo)."""
    return await item_service.update_item(db, current_user.id, item_id, data)

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Exclui um item caso não haja despesas atreladas a ele."""
    await item_service.delete_item(db, current_user.id, item_id)
