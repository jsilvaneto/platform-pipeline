from collections.abc import Sequence
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.item import Item
from app.models.category import Category
from app.models.expense import Expense
from app.schemas.item import ItemCreate, ItemUpdate
from app.services.category_service import ensure_default_categories

DEFAULT_ITEMS_BY_CATEGORY: dict[str, list[dict[str, str]]] = {
    "Alimentação": [
        {"name": "Supermercado", "nature": "NECESSARIO"},
        {"name": "Restaurante & Almoço", "nature": "DESEJO"},
        {"name": "Padaria & Lanches", "nature": "NECESSARIO"},
        {"name": "Delivery & Fast Food", "nature": "DESEJO"},
    ],
    "Moradia": [
        {"name": "Aluguel & Condomínio", "nature": "OBRIGATORIO"},
        {"name": "Energia Elétrica", "nature": "OBRIGATORIO"},
        {"name": "Água & Saneamento", "nature": "OBRIGATORIO"},
        {"name": "Internet & Telefonia", "nature": "OBRIGATORIO"},
        {"name": "Gás de Cozinha", "nature": "OBRIGATORIO"},
    ],
    "Transporte": [
        {"name": "Combustível", "nature": "NECESSARIO"},
        {"name": "Transporte Público / Metrô", "nature": "NECESSARIO"},
        {"name": "Aplicativos (Uber / 99)", "nature": "NECESSARIO"},
        {"name": "Manutenção Veicular", "nature": "NECESSARIO"},
        {"name": "Estacionamento & Pedágio", "nature": "NECESSARIO"},
    ],
    "Saúde": [
        {"name": "Farmácia & Medicamentos", "nature": "OBRIGATORIO"},
        {"name": "Plano de Saúde", "nature": "OBRIGATORIO"},
        {"name": "Consultas & Exames", "nature": "OBRIGATORIO"},
    ],
    "Lazer & Bem-estar": [
        {"name": "Cinema, Shows & Eventos", "nature": "DESEJO"},
        {"name": "Viagens & Hospedagem", "nature": "DESEJO"},
        {"name": "Academia & Atividades Físicas", "nature": "NECESSARIO"},
        {"name": "Cuidados Pessoais & Salão", "nature": "DESEJO"},
    ],
    "Educação": [
        {"name": "Mensalidade Escolar / Faculdade", "nature": "OBRIGATORIO"},
        {"name": "Cursos & Certificações", "nature": "NECESSARIO"},
        {"name": "Livros & Material Didático", "nature": "NECESSARIO"},
    ],
    "Assinaturas & Serviços": [
        {"name": "Streaming de Vídeo & Música", "nature": "DESEJO"},
        {"name": "Softwares & Armazenamento Nuvem", "nature": "NECESSARIO"},
    ],
    "Outros": [
        {"name": "Despesas Diversas", "nature": "NENHUM"},
    ],
}

async def ensure_default_items(db: AsyncSession, user_id: str) -> None:
    """Gera itens padrão para o usuário caso não possua nenhum item cadastrado."""
    # Garante que as categorias padrão já existem
    await ensure_default_categories(db, user_id)

    item_count = await db.scalar(
        select(func.count(Item.id)).where(Item.user_id == user_id)
    )
    if item_count and item_count > 0:
        return

    # Busca categorias do usuário para mapear os nomes
    cat_res = await db.execute(
        select(Category).where(Category.user_id == user_id)
    )
    categories = {c.name: c.id for c in cat_res.scalars().all()}

    for cat_name, items in DEFAULT_ITEMS_BY_CATEGORY.items():
        cat_id = categories.get(cat_name)
        if not cat_id:
            continue
        for item_data in items:
            new_item = Item(
                user_id=user_id,
                category_id=cat_id,
                name=item_data["name"],
                nature=item_data["nature"],
                is_active=True,
            )
            db.add(new_item)

    await db.commit()

async def list_items(
    db: AsyncSession,
    user_id: str,
    category_id: str | None = None,
    active_only: bool = False,
) -> Sequence[Item]:
    """Retorna itens cadastrados pelo usuário com opções de filtro."""
    await ensure_default_items(db, user_id)

    query = (
        select(Item)
        .options(selectinload(Item.category))
        .where(Item.user_id == user_id)
    )

    if category_id:
        query = query.where(Item.category_id == category_id)

    if active_only:
        query = query.where(Item.is_active.is_(True))

    query = query.order_by(Item.name.asc())
    result = await db.execute(query)
    return result.scalars().all()

async def get_item(db: AsyncSession, user_id: str, item_id: str) -> Item:
    """Busca um item específico pelo ID garantindo isolamento por usuário."""
    query = (
        select(Item)
        .options(selectinload(Item.category))
        .where(Item.id == item_id, Item.user_id == user_id)
    )
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item não encontrado ou não pertence ao usuário."
        )
    return item

async def create_item(db: AsyncSession, user_id: str, data: ItemCreate) -> Item:
    """Cria um novo item vinculado a uma categoria do usuário."""
    # Valida categoria
    cat_query = select(Category).where(
        Category.id == data.category_id, Category.user_id == user_id
    )
    cat_res = await db.execute(cat_query)
    if not cat_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Categoria informada é inválida ou não pertence ao usuário."
        )

    item = Item(
        user_id=user_id,
        category_id=data.category_id,
        name=data.name.strip(),
        nature=data.nature,
        is_active=data.is_active,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return await get_item(db, user_id, item.id)

async def update_item(
    db: AsyncSession, user_id: str, item_id: str, data: ItemUpdate
) -> Item:
    """Atualiza atributos do item."""
    item = await get_item(db, user_id, item_id)

    if data.category_id is not None:
        cat_query = select(Category).where(
            Category.id == data.category_id, Category.user_id == user_id
        )
        cat_res = await db.execute(cat_query)
        if not cat_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Categoria informada é inválida."
            )
        item.category_id = data.category_id

    if data.name is not None:
        item.name = data.name.strip()
    if data.nature is not None:
        item.nature = data.nature
    if data.is_active is not None:
        item.is_active = data.is_active

    await db.commit()
    await db.refresh(item)
    return await get_item(db, user_id, item.id)

async def delete_item(db: AsyncSession, user_id: str, item_id: str) -> None:
    """Exclui o item caso não possua despesas atreladas."""
    item = await get_item(db, user_id, item_id)

    # Verifica se existem despesas associadas a este item
    expense_check = await db.scalar(
        select(func.count(Expense.id)).where(
            Expense.item_id == item_id, Expense.user_id == user_id
        )
    )
    if expense_check and expense_check > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Este item possui {expense_check} despesa(s) vinculada(s) e não pode ser excluído. "
                "Para ocultá-lo em novos lançamentos, desative-o."
            )
        )

    await db.delete(item)
    await db.commit()
