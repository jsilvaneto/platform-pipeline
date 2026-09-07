from typing import Sequence
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate, ItemFilter

class ItemService:
    @staticmethod
    async def list_items(db: AsyncSession, filter_params: ItemFilter) -> Sequence[Item]:
        """Lista itens com suporte a busca textual, filtro de status e paginação."""
        query = select(Item)

        if filter_params.status:
            query = query.where(Item.status == filter_params.status)

        if filter_params.search:
            search_pattern = f"%{filter_params.search.strip()}%"
            query = query.where(
                or_(
                    Item.title.ilike(search_pattern),
                    Item.description.ilike(search_pattern)
                )
            )

        query = query.order_by(Item.created_at.desc())
        query = query.offset(filter_params.offset).limit(filter_params.limit)

        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_item_by_id(db: AsyncSession, item_id: str) -> Item:
        """Busca um item pelo seu ID UUID. Lança 404 se não encontrado."""
        query = select(Item).where(Item.id == item_id)
        result = await db.execute(query)
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item com ID '{item_id}' não encontrado."
            )
        return item

    @staticmethod
    async def create_item(db: AsyncSession, item_in: ItemCreate, user_id: str | None = None) -> Item:
        """Cria um novo item no banco com transação atômica."""
        item = Item(
            title=item_in.title.strip(),
            description=item_in.description.strip() if item_in.description else None,
            status=item_in.status,
            user_id=user_id
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def update_item(db: AsyncSession, item_id: str, item_in: ItemUpdate) -> Item:
        """Atualiza parcialmente um item existente."""
        item = await ItemService.get_item_by_id(db, item_id)

        update_data = item_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "title" and value is not None:
                value = value.strip()
            if field == "description" and value is not None:
                value = value.strip()
            setattr(item, field, value)

        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def delete_item(db: AsyncSession, item_id: str) -> bool:
        """Exclui um item existente."""
        item = await ItemService.get_item_by_id(db, item_id)
        await db.delete(item)
        await db.commit()
        return True
