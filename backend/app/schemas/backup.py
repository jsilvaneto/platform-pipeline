from typing import Literal
from pydantic import BaseModel, Field


class BackupItem(BaseModel):
    """Representação padronizada de um arquivo de backup local (PostgreSQL dump)."""

    id: str = Field(..., description="Identificador único (nome do arquivo .dump)")
    filename: str = Field(..., description="Nome do arquivo .dump")
    size_bytes: int = Field(..., description="Tamanho em bytes")
    size_pretty: str = Field(..., description="Tamanho legível (ex: 2.34 MB)")
    created_at: str = Field(..., description="Timestamp ISO da data de criação")
    source: Literal["local"] = Field(default="local", description="Origem do arquivo de backup")


class BackupListResponse(BaseModel):
    """Resposta com lista de backups locais disponíveis e metadados agregados."""

    items: list[BackupItem] = Field(default_factory=list, description="Lista ordenada cronologicamente de backups")
    total: int = Field(..., description="Total de backups encontrados")


class BackupStatusResponse(BaseModel):
    """Diagnóstico consolidado de backups e armazenamento local."""

    local_backups_count: int = Field(..., description="Quantidade de backups no armazenamento local")
    total_disk_usage_pretty: str = Field(..., description="Uso de disco total da pasta local de backups")
    last_backup_at: str | None = Field(default=None, description="Data/hora do último backup realizado")
    retention_days: int = Field(default=30, description="Período de retenção em dias para expurgo automático")
    backups_dir: str = Field(..., description="Caminho configurado do diretório de backups")


class BackupCreateResponse(BaseModel):
    """Resultado da execução de um backup manual."""

    success: bool = Field(..., description="Indica se o backup foi gerado com sucesso")
    filename: str = Field(..., description="Nome do arquivo de dump gerado")
    size_bytes: int = Field(..., description="Tamanho em bytes do dump")
    size_pretty: str = Field(..., description="Tamanho formatado do dump")
    created_at: str = Field(..., description="Data/hora da criação")
    message: str = Field(..., description="Mensagem de resumo do procedimento")


class BackupRestoreRequest(BaseModel):
    """Solicitação de restauração de banco de dados a partir de um backup."""

    backup_id: str = Field(..., description="ID do backup (nome do arquivo local .dump)")
    source: Literal["local"] = Field(default="local", description="Origem de onde restaurar")
    confirmation_token: str = Field(
        ...,
        description="Token de segurança exigido para evitar acidentes. Deve ser 'RESTAURAR'.",
    )


class BackupRestoreResponse(BaseModel):
    """Resultado da operação de restauração de banco de dados."""

    success: bool = Field(..., description="Indica se o restore foi concluído com sucesso")
    message: str = Field(..., description="Mensagem de status do processo de restauração")
    restored_at: str = Field(..., description="Timestamp ISO da restauração")

