from collections.abc import Sequence
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash

async def list_users(db: AsyncSession) -> Sequence[User]:
    """Lista todos os usuários cadastrados no sistema ordenados por nome."""
    result = await db.execute(select(User).order_by(User.username.asc()))
    return result.scalars().all()

async def get_user(db: AsyncSession, user_id: str) -> User:
    """Busca usuário pelo ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado."
        )
    return user

async def create_user(db: AsyncSession, data: UserCreate) -> User:
    """Cria um novo usuário garantindo unicidade de username."""
    normalized_username = data.username.strip().lower()
    existing = await db.execute(
        select(User).where(User.username == normalized_username)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nome de usuário já cadastrado."
        )

    user = User(
        username=normalized_username,
        hashed_password=get_password_hash(data.password),
        is_admin=data.is_admin,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def update_user(
    db: AsyncSession, user_id: str, data: UserUpdate, current_user_id: str
) -> User:
    """Atualiza dados do usuário (senha, status ativo/inativo ou privilégio admin)."""
    user = await get_user(db, user_id)

    # Não permite que o usuário desative a si próprio
    if data.is_active is False and user.id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode desativar o seu próprio usuário."
        )

    # Não permite remover os privilégios de admin de si próprio
    if data.is_admin is False and user.id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode remover seu próprio privilégio de administrador."
        )

    if data.password is not None:
        user.hashed_password = get_password_hash(data.password)
    if data.is_admin is not None:
        user.is_admin = data.is_admin
    if data.is_active is not None:
        user.is_active = data.is_active

    await db.commit()
    await db.refresh(user)
    return user

async def delete_user(db: AsyncSession, user_id: str, current_user_id: str) -> None:
    """Remove um usuário do sistema."""
    if user_id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode excluir o seu próprio usuário em sessão."
        )

    user = await get_user(db, user_id)
    await db.delete(user)
    await db.commit()
