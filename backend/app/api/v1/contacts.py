from collections.abc import Sequence
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.contact import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactSummaryResponse,
)
from app.services import contact_service

router = APIRouter(prefix="/contacts", tags=["Contatos & Pessoas"])


@router.get("/", response_model=list[ContactResponse])
async def list_contacts(
    active_only: bool = Query(default=False, description="Filtrar apenas contatos ativos"),
    search: str | None = Query(default=None, description="Buscar por nome, e-mail ou telefone"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Sequence[ContactResponse]:
    """Retorna a lista de contatos do usuário autenticado com auto-seeding inicial se necessário."""
    return await contact_service.list_contacts(
        db, current_user.id, active_only=active_only, search=search
    )


@router.post("/", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    data: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContactResponse:
    """Cria um novo contato para o usuário."""
    return await contact_service.create_contact(db, current_user.id, data)


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContactResponse:
    """Busca detalhes de um contato específico."""
    return await contact_service.get_contact(db, current_user.id, contact_id)


@router.get("/{contact_id}/summary", response_model=ContactSummaryResponse)
async def get_contact_summary(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContactSummaryResponse:
    """Retorna o resumo financeiro, histórico de registros e pagamentos planejados do contato."""
    return await contact_service.get_contact_summary(db, current_user.id, contact_id)


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    data: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContactResponse:
    """Atualiza dados cadastrais de um contato."""
    return await contact_service.update_contact(db, current_user.id, contact_id, data)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Exclui um contato. Retorna 409 Conflict se houver lançamentos associados."""
    await contact_service.delete_contact(db, current_user.id, contact_id)
