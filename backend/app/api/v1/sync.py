from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db
from app.models import User, SyncLog
from app.schemas.sync import (
    SyncStatusResponse,
    SyncLogResponse,
    MobileSyncPullResponse,
    MobileSyncPushRequest,
    MobileSyncPushResponse,
    ProfileType
)
from app.services.mobile_sync_service import (
    get_sync_status,
    get_mobile_sync_pull,
    process_mobile_sync_push
)
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/sync", tags=["Sincronização Mobile & API"])

@router.get("/status", response_model=SyncStatusResponse)
async def get_system_sync_status(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Retorna o status operacional da API, integridade do banco SQLite WAL,
    saúde do diretório de armazenamento e último evento de sincronização.
    """
    return await get_sync_status(db)

@router.get("/mobile/pull", response_model=MobileSyncPullResponse)
async def pull_mobile_data(
    profile: Optional[ProfileType] = Query(None, description="Filtrar por PESSOAL ou EMPRESA"),
    since: Optional[str] = Query(None, description="Timestamp ISO para filtro delta de alterações"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Exporta dados mestres (categorias, contas, formas de pagamento, cartões, itens, etc.)
    e lançamentos criados ou alterados para sincronização e cache offline no app mobile Android.
    """
    return await get_mobile_sync_pull(db, profile=profile, since=since)

@router.post("/mobile/push", response_model=MobileSyncPushResponse)
async def push_mobile_data(
    payload: MobileSyncPushRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Recebe em lote lançamentos criados ou alterados offline no aplicativo Android
    e os grava atomicamente no banco de dados SQLite local com resolução idempotente.
    """
    return await process_mobile_sync_push(
        db=db,
        profile=payload.profile,
        transactions_data=payload.transactions
    )

@router.get("/logs", response_model=List[SyncLogResponse])
async def list_sync_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Retorna o histórico e registros de auditoria de sincronização móvel."""
    query = select(SyncLog).order_by(SyncLog.created_at.desc()).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()

@router.delete("/logs", status_code=status.HTTP_204_NO_CONTENT)
async def clear_sync_logs(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Limpa o histórico de auditoria de sincronização."""
    await db.execute(delete(SyncLog))
    await db.commit()
