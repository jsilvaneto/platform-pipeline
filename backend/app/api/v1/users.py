from collections.abc import Sequence
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Gerenciamento de Usuários"])

@router.get("/", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin_user: User = Depends(get_current_admin_user),
) -> Sequence[UserResponse]:
    """Lista todos os usuários do sistema (acesso restrito a administradores)."""
    return await user_service.list_users(db)

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin_user: User = Depends(get_current_admin_user),
) -> UserResponse:
    """Cria um novo usuário com acesso ao sistema."""
    return await user_service.create_user(db, data)

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> UserResponse:
    """Atualiza atributos do usuário (status, senha, admin)."""
    return await user_service.update_user(db, user_id, data, admin_user.id)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> None:
    """Remove um usuário do sistema."""
    await user_service.delete_user(db, user_id, admin_user.id)
