from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.storage import StorageConfigResponse, StorageConfigUpdate
from app.services.storage_service import StorageService

router = APIRouter(prefix="/storage", tags=["Armazenamento"])


@router.get(
    "/config",
    response_model=StorageConfigResponse,
    summary="Obter diagnóstico e diretórios configurados de armazenamento",
)
async def get_storage_config(
    current_user: User = Depends(get_current_user),
) -> StorageConfigResponse:
    """Retorna os caminhos dos diretórios de backups e anexos, status de escrita, espaço em disco e sugestões."""
    return StorageService.get_config()


@router.post(
    "/config",
    response_model=StorageConfigResponse,
    summary="Atualizar e testar diretórios de armazenamento",
)
async def update_storage_config(
    payload: StorageConfigUpdate,
    current_user: User = Depends(get_current_user),
) -> StorageConfigResponse:
    """Valida a permissão de gravação nos caminhos informados (Windows ou WSL) e persiste a configuração."""
    try:
        return StorageService.update_config(payload)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro inesperado ao salvar diretórios de armazenamento: {str(err)}",
        )
