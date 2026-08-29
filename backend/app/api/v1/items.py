from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.models import Item, Category, User
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/items", tags=["Itens"])

@router.get("", response_model=List[ItemResponse])
async def list_items(
    profile: Optional[str] = Query(None, description="Filtrar por PESSOAL ou EMPRESA"),
    category_id: Optional[str] = Query(None, description="Filtrar por categoria"),
    type: Optional[str] = Query(None, description="Filtrar por tipo da categoria (RECEITA ou DESPESA)"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = (
        select(
            Item,
            Category.name.label("cat_name"),
            Category.type.label("cat_type"),
            Category.nature.label("cat_nature")
        )
        .join(Category, Item.category_id == Category.id)
    )
    if profile:
        query = query.where(Item.profile == profile)
    if category_id:
        query = query.where(Item.category_id == category_id)
    if type:
        query = query.where(Category.type == type)

    query = query.order_by(Category.name.asc(), Item.name.asc())
    result = await db.execute(query)
    records = result.all()

    items_out = []
    for item, cat_name, cat_type, cat_nature in records:
        items_out.append(ItemResponse(
            id=item.id,
            profile=item.profile,
            category_id=item.category_id,
            name=item.name,
            default_amount_cents=item.default_amount_cents,
            category_name=cat_name,
            category_type=cat_type,
            category_nature=cat_nature,
            created_at=item.created_at
        ))
    return items_out

@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    item_in: ItemCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    # Valida categoria
    category = await db.get(Category, item_in.category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categoria inexistente.")
    if category.profile != item_in.profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A categoria informada pertence a outro perfil financeiro."
        )

    new_item = Item(**item_in.model_dump())
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)

    return ItemResponse(
        id=new_item.id,
        profile=new_item.profile,
        category_id=new_item.category_id,
        name=new_item.name,
        default_amount_cents=new_item.default_amount_cents,
        category_name=category.name,
        category_type=category.type,
        category_nature=category.nature,
        created_at=new_item.created_at
    )

@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: str,
    item_in: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    item = await db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado.")
    
    if item_in.category_id:
        category = await db.get(Category, item_in.category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categoria inexistente.")
        if category.profile != item.profile:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categoria pertence a outro perfil.")

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    await db.commit()
    await db.refresh(item)

    # Busca categoria atualizada para resposta rica
    category = await db.get(Category, item.category_id)

    return ItemResponse(
        id=item.id,
        profile=item.profile,
        category_id=item.category_id,
        name=item.name,
        default_amount_cents=item.default_amount_cents,
        category_name=category.name if category else None,
        category_type=category.type if category else None,
        category_nature=category.nature if category else None,
        created_at=item.created_at
    )

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    item = await db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado.")
    await db.delete(item)
    await db.commit()

