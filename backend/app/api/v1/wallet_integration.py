from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.wallet_integration import (
    WalletIntegrationCreate,
    WalletIntegrationResponse,
    WalletIntegrationTestRequest,
    WalletIntegrationTestResponse,
    WalletSyncTriggerRequest,
    WalletSyncJobStatus,
)
from app.services import wallet_integration_service, wallet_sync_service

router = APIRouter(prefix="/wallet-integration", tags=["Integração Wallet API"])


@router.get("", response_model=WalletIntegrationResponse)
async def get_wallet_integration(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WalletIntegrationResponse:
    """Retorna o status e metadados da integração Wallet sem expor a chave de API."""
    return await wallet_integration_service.get_integration(
        db=db,
        user_id=current_user.id,
    )


@router.post("", response_model=WalletIntegrationResponse, status_code=status.HTTP_201_CREATED)
async def save_wallet_credentials(
    payload: WalletIntegrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WalletIntegrationResponse:
    """Armazena ou substitui com criptografia de ponta o token da API BudgetBakers."""
    return await wallet_integration_service.save_credentials(
        db=db,
        user_id=current_user.id,
        data=payload,
    )


@router.post("/test", response_model=WalletIntegrationTestResponse)
async def test_wallet_connection(
    payload: WalletIntegrationTestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WalletIntegrationTestResponse:
    """Testa a autenticidade e validade da chave de API junto aos servidores oficiais."""
    return await wallet_integration_service.test_connection(
        db=db,
        user_id=current_user.id,
        data=payload,
    )


@router.post("/sync", response_model=WalletSyncJobStatus)
async def trigger_wallet_sync(
    payload: WalletSyncTriggerRequest,
    current_user: User = Depends(get_current_user),
) -> WalletSyncJobStatus:
    """Aciona a sincronização em segundo plano (full ou incremental)."""
    return await wallet_sync_service.trigger_sync(
        user_id=current_user.id,
        mode=payload.mode,
    )


@router.get("/sync-status", response_model=WalletSyncJobStatus)
async def get_wallet_sync_status(
    current_user: User = Depends(get_current_user),
) -> WalletSyncJobStatus:
    """Consulta o progresso em tempo real da tarefa de sincronização ativa."""
    return wallet_sync_service.get_sync_status(user_id=current_user.id)


@router.delete("", status_code=status.HTTP_200_OK)
async def delete_wallet_credentials(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Remove a chave de API armazenada e desconecta a sincronização."""
    await wallet_integration_service.delete_credentials(
        db=db,
        user_id=current_user.id,
    )
    return {"detail": "Credenciais da Wallet API removidas com sucesso."}

