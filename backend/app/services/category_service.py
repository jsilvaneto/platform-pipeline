from collections.abc import Sequence
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate

DEFAULT_CATEGORIES = [
    {"name": "Alimentação", "icon": "Utensils", "color": "#ef4444"},
    {"name": "Moradia", "icon": "Home", "color": "#3b82f6"},
    {"name": "Transporte", "icon": "Car", "color": "#f59e0b"},
    {"name": "Saúde", "icon": "HeartPulse", "color": "#10b981"},
    {"name": "Lazer & Bem-estar", "icon": "Smile", "color": "#8b5cf6"},
    {"name": "Educação", "icon": "GraduationCap", "color": "#06b6d4"},
    {"name": "Assinaturas & Serviços", "icon": "Tv", "color": "#ec4899"},
    {"name": "Outros", "icon": "MoreHorizontal", "color": "#6b7280"},
]

async def ensure_default_categories(db: AsyncSession, user_id: str) -> None:
    """Gera automaticamente as categorias padrão de finanças pessoais para o usuário se não existirem."""
    result = await db.execute(select(Category).where(Category.user_id == user_id))
    existing = result.scalars().first()
    if existing is None:
        for item in DEFAULT_CATEGORIES:
            category = Category(
                user_id=user_id,
                name=item["name"],
                icon=item["icon"],
                color=item["color"],
            )
            db.add(category)
        await db.commit()

async def list_categories(db: AsyncSession, user_id: str) -> Sequence[Category]:
    """Retorna todas as categorias pertencentes ao usuário autenticado."""
    await ensure_default_categories(db, user_id)
    result = await db.execute(
        select(Category).where(Category.user_id == user_id).order_by(Category.name.asc())
    )
    return result.scalars().all()

async def get_category(db: AsyncSession, user_id: str, category_id: str) -> Category:
    """Busca uma categoria específica garantindo isolamento por usuário."""
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada ou não pertence ao usuário."
        )
    return category

async def create_category(db: AsyncSession, user_id: str, data: CategoryCreate) -> Category:
    """Cria uma nova categoria de despesas vinculada ao usuário."""
    category = Category(
        user_id=user_id,
        name=data.name.strip(),
        icon=data.icon.strip(),
        color=data.color.strip()
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

async def update_category(
    db: AsyncSession, user_id: str, category_id: str, data: CategoryUpdate
) -> Category:
    """Atualiza atributos da categoria do usuário."""
    category = await get_category(db, user_id, category_id)
    if data.name is not None:
        category.name = data.name.strip()
    if data.icon is not None:
        category.icon = data.icon.strip()
    if data.color is not None:
        category.color = data.color.strip()

    await db.commit()
    await db.refresh(category)
    return category

async def delete_category(db: AsyncSession, user_id: str, category_id: str) -> None:
    """Exclui a categoria do usuário."""
    category = await get_category(db, user_id, category_id)
    await db.delete(category)
    await db.commit()
