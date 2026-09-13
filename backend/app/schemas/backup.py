from typing import Literal
from pydantic import BaseModel, Field


class GoogleDriveConfigStatus(BaseModel):
    """Metadados e diagnóstico de conectividade com a API do Google Drive."""

    is_configured: bool = Field(..., description="Indica se credenciais e pasta foram configuradas")
    connection_ok: bool = Field(..., description="Indica se a conexão de teste com a Google API foi bem-sucedida")
    folder_id: str | None = Field(default=None, description="ID da pasta destino no Google Drive")
    service_account_email: str | None = Field(default=None, description="Email da Service Account extraído do JSON")
    retention_days: int = Field(default=30, description="Período de retenção em dias para rotação automática")
    status_message: str = Field(..., description="Mensagem explicativa legível do status")


class BackupItem(BaseModel):
    """Representação padronizada de um arquivo de backup no Google Drive ou local."""

    id: str = Field(..., description="Identificador único (fileId do Drive ou nome do arquivo local)")
    filename: str = Field(..., description="Nome do arquivo .dump")
    size_bytes: int = Field(..., description="Tamanho em bytes")
    size_pretty: str = Field(..., description="Tamanho legível (ex: 2.34 MB)")
    created_at: str = Field(..., description="Timestamp ISO da data de criação")
    source: Literal["gdrive", "local"] = Field(..., description="Origem do arquivo de backup")
    drive_file_id: str | None = Field(default=None, description="ID do arquivo no Google Drive se remoto")


class BackupListResponse(BaseModel):
    """Resposta com lista de backups disponíveis e metadados agregados."""

    items: list[BackupItem] = Field(default_factory=list, description="Lista ordenada cronologicamente de backups")
    total: int = Field(..., description="Total de backups encontrados")
    google_drive_connected: bool = Field(..., description="Status da conexão com o Google Drive")


class BackupStatusResponse(BaseModel):
    """Diagnóstico consolidado de backups e Google Drive para o menu de configurações."""

    google_drive: GoogleDriveConfigStatus = Field(..., description="Status de integração com Google Drive")
    local_backups_count: int = Field(..., description="Quantidade de backups no armazenamento local")
    drive_backups_count: int = Field(..., description="Quantidade de backups no Google Drive")
    total_disk_usage_pretty: str = Field(..., description="Uso de disco total da pasta local de backups")
    last_backup_at: str | None = Field(default=None, description="Data/hora do último backup realizado")


class BackupCreateResponse(BaseModel):
    """Resultado da execução de um backup manual."""

    success: bool = Field(..., description="Indica se o backup foi gerado com sucesso")
    filename: str = Field(..., description="Nome do arquivo de dump gerado")
    size_bytes: int = Field(..., description="Tamanho em bytes do dump")
    size_pretty: str = Field(..., description="Tamanho formatado do dump")
    created_at: str = Field(..., description="Data/hora da criação")
    uploaded_to_gdrive: bool = Field(..., description="Indica se foi transmitido para o Google Drive")
    drive_file_id: str | None = Field(default=None, description="ID do arquivo gerado no Google Drive")
    message: str = Field(..., description="Mensagem de resumo do procedimento")


class BackupRestoreRequest(BaseModel):
    """Solicitação de restauração de banco de dados a partir de um backup."""

    backup_id: str = Field(..., description="ID do backup (nome do arquivo local ou fileId do Google Drive)")
    source: Literal["gdrive", "local"] = Field(..., description="Origem de onde restaurar")
    confirmation_token: str = Field(
        ...,
        description="Token de segurança exigido para evitar acidentes. Deve ser 'RESTAURAR'.",
    )


class BackupRestoreResponse(BaseModel):
    """Resultado da operação de restauração de banco de dados."""

    success: bool = Field(..., description="Indica se o restore foi concluído com sucesso")
    message: str = Field(..., description="Mensagem de status do processo de restauração")
    restored_at: str = Field(..., description="Timestamp ISO da restauração")
