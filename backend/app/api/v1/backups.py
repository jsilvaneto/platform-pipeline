from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse

from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.schemas.backup import (
    BackupCreateResponse,
    BackupListResponse,
    BackupRestoreRequest,
    BackupRestoreResponse,
    BackupStatusResponse,
)
from app.services.backup_service import BackupService

router = APIRouter(prefix="/backups", tags=["Gestão de Backups & Google Drive"])


@router.get("/status", response_model=BackupStatusResponse)
async def get_backup_status(
    _: User = Depends(get_current_admin_user),
) -> BackupStatusResponse:
    """Retorna o diagnóstico da integração com o Google Drive e o status do armazenamento local."""
    return BackupService.get_status()


@router.get("/", response_model=BackupListResponse)
async def list_available_backups(
    _: User = Depends(get_current_admin_user),
) -> BackupListResponse:
    """Lista todos os backups disponíveis no Google Drive e no disco local."""
    return BackupService.list_backups()


@router.post("/create", response_model=BackupCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_backup_now(
    _: User = Depends(get_current_admin_user),
) -> BackupCreateResponse:
    """
    Gera um novo snapshot do banco de dados imediatamente.
    Realiza o envio seguro para a pasta configurada do Google Drive e aplica retenção.
    """
    try:
        return BackupService.create_backup()
    except RuntimeError as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(err),
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro imprevisto durante o processo de backup: {str(err)}",
        )


@router.post("/restore", response_model=BackupRestoreResponse)
async def restore_backup(
    payload: BackupRestoreRequest,
    _: User = Depends(get_current_admin_user),
) -> BackupRestoreResponse:
    """
    Restaura o banco de dados a partir de um backup local ou do Google Drive.
    ATENÇÃO: Operação destrutiva que substitui os dados atuais. Exige confirmation_token = 'RESTAURAR'.
    """
    if payload.confirmation_token.strip().upper() != "RESTAURAR":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de confirmação inválido. Digite exatamente 'RESTAURAR' para prosseguir.",
        )

    try:
        return BackupService.restore_backup(
            backup_id=payload.backup_id,
            source=payload.source,
        )
    except FileNotFoundError as err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(err),
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )
    except RuntimeError as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(err),
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha durante a restauração do banco de dados: {str(err)}",
        )


@router.get("/{backup_id}/download")
async def download_backup_file(
    backup_id: str,
    source: Literal["gdrive", "local"] = Query("local", description="Origem do arquivo de backup"),
    _: User = Depends(get_current_admin_user),
) -> FileResponse:
    """Permite que o administrador baixe o arquivo binário .dump diretamente pelo navegador."""
    try:
        file_path, original_filename = BackupService.get_backup_path_for_download(
            backup_id=backup_id,
            source=source,
        )
        return FileResponse(
            path=str(file_path),
            filename=original_filename,
            media_type="application/octet-stream",
        )
    except FileNotFoundError as err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(err),
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter arquivo para download: {str(err)}",
        )
