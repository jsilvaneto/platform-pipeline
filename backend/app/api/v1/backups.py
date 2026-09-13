from typing import Literal
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.schemas.backup import (
    BackupCreateResponse,
    BackupListResponse,
    BackupRestoreRequest,
    BackupRestoreResponse,
    BackupStatusResponse,
    GoogleDriveConfigUpdateRequest,
    GoogleOAuthClientSaveRequest,
    GoogleOAuthExchangeRequest,
    GoogleOAuthInitRequest,
    GoogleOAuthInitResponse,
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


@router.put("/config/gdrive", response_model=BackupStatusResponse)
async def update_gdrive_config(
    payload: GoogleDriveConfigUpdateRequest,
    _: User = Depends(get_current_admin_user),
) -> BackupStatusResponse:
    """Atualiza o ID da pasta do Google Drive e o período de retenção de snapshots."""
    try:
        return BackupService.save_gdrive_config(
            folder_id=payload.folder_id,
            retention_days=payload.retention_days,
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao salvar configurações do Google Drive: {str(err)}",
        )


@router.post("/config/credentials", response_model=BackupStatusResponse)
async def upload_credentials_file(
    file: UploadFile = File(..., description="Arquivo JSON de credenciais da Conta de Serviço"),
    _: User = Depends(get_current_admin_user),
) -> BackupStatusResponse:
    """
    Recebe o arquivo JSON de credenciais da Conta de Serviço do Google Cloud via upload na interface.
    Valida sua estrutura interna e o armazena de forma segura e persistente.
    """
    if not file.filename or not file.filename.lower().endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo enviado deve ser do tipo .json.",
        )

    try:
        content = await file.read()
        status_res, _ = BackupService.save_credentials_file(
            file_bytes=content,
            original_filename=file.filename,
        )
        return status_res
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao processar arquivo de credenciais: {str(err)}",
        )


@router.post("/config/test", response_model=BackupStatusResponse)
async def test_gdrive_connection(
    _: User = Depends(get_current_admin_user),
) -> BackupStatusResponse:
    """Executa um teste imediato de conectividade com a API do Google Drive."""
    return BackupService.get_status()


@router.delete("/config/gdrive", response_model=BackupStatusResponse)
async def disconnect_gdrive(
    _: User = Depends(get_current_admin_user),
) -> BackupStatusResponse:
    """Desconecta a integração com Google Drive e limpa as credenciais e pasta vinculadas."""
    return BackupService.delete_gdrive_config()


@router.post("/oauth2/init", response_model=GoogleOAuthInitResponse)
async def init_google_oauth(
    payload: GoogleOAuthInitRequest,
    _: User = Depends(get_current_admin_user),
) -> GoogleOAuthInitResponse:
    """
    Inicializa o fluxo Google OAuth 2.0 para contas pessoais (@gmail.com).
    Gera a URL segura de autorização do Google.
    """
    try:
        return BackupService.get_oauth_auth_url(
            redirect_uri=payload.redirect_uri,
            client_id=payload.client_id,
            client_secret=payload.client_secret,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao gerar URL de autorização OAuth: {str(err)}",
        )


@router.post("/oauth2/exchange", response_model=BackupStatusResponse)
async def exchange_google_oauth_code(
    payload: GoogleOAuthExchangeRequest,
    _: User = Depends(get_current_admin_user),
) -> BackupStatusResponse:
    """
    Troca o código de autorização fornecido pelo Google pelos tokens OAuth 2.0.
    Ativa a sincronização de backups na conta pessoal do usuário.
    """
    try:
        return BackupService.exchange_oauth_code(
            code=payload.code,
            redirect_uri=payload.redirect_uri,
            folder_id=payload.folder_id,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao concluir autorização OAuth com o Google: {str(err)}",
        )


@router.post("/oauth2/client", response_model=BackupStatusResponse)
async def save_google_oauth_client(
    payload: GoogleOAuthClientSaveRequest,
    _: User = Depends(get_current_admin_user),
) -> BackupStatusResponse:
    """Salva diretamente o Client ID e Client Secret do aplicativo Google Cloud."""
    BackupService.save_oauth_client(
        client_id=payload.client_id,
        client_secret=payload.client_secret,
    )
    return BackupService.get_status()

