from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse, ItemFilter, ItemStatus
from app.services.item_service import ItemService
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/items", tags=["Itens (Scaffold)"])

@router.get("", response_model=List[ItemResponse])
async def list_items(
    status_filter: Optional[ItemStatus] = Query(None, alias="status", description="Filtrar por status"),
    search: Optional[str] = Query(None, description="Busca textual por título ou descrição"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Retorna listagem de itens cadastrados com filtros e paginação."""
    filters = ItemFilter(
        status=status_filter,
        search=search,
        limit=limit,
        offset=offset
    )
    return await ItemService.list_items(db, filters)

@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    item_in: ItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cadastra um novo item vinculado opcionalmente ao usuário logado."""
    return await ItemService.create_item(db, item_in, user_id=current_user.id)

@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Busca os detalhes de um item específico por ID."""
    return await ItemService.get_item_by_id(db, item_id)

@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: str,
    item_in: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Atualiza campos de um item existente."""
    return await ItemService.update_item(db, item_id, item_in)

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Remove permanentemente um item pelo seu ID."""
    await ItemService.delete_item(db, item_id)
    return None
