from pydantic import BaseModel, Field


class DirectoryHealth(BaseModel):
    """Diagnóstico detalhado de integridade e espaço de um diretório de armazenamento."""

    configured_path: str = Field(..., description="Caminho configurado (Windows, WSL ou container)")
    resolved_path: str = Field(..., description="Caminho absoluto resolvido no ambiente do backend")
    exists: bool = Field(..., description="Indica se o diretório existe no disco")
    is_writable: bool = Field(..., description="Indica se o backend possui permissão efetiva de leitura e gravação")
    free_space_bytes: int = Field(default=0, description="Espaço livre disponível na unidade em bytes")
    free_space_pretty: str = Field(default="0 B", description="Espaço livre legível (ex: 124.5 GB)")
    total_space_bytes: int = Field(default=0, description="Espaço total da partição em bytes")
    total_space_pretty: str = Field(default="0 B", description="Espaço total legível")
    files_count: int = Field(default=0, description="Quantidade total de arquivos no diretório")
    total_files_size_pretty: str = Field(default="0 B", description="Tamanho total dos arquivos contidos")
    error_message: str | None = Field(default=None, description="Mensagem de erro de acesso ou permissão caso ocorra")


class StorageSuggestion(BaseModel):
    """Sugestão inteligente de caminho detectada no ambiente host (ex: Google Drive para Desktop no Windows)."""

    label: str = Field(..., description="Descrição amigável da sugestão")
    backups_dir: str = Field(..., description="Caminho sugerido para a pasta de backups")
    attachments_dir: str = Field(..., description="Caminho sugerido para a pasta de anexos")


class StorageConfigResponse(BaseModel):
    """Resposta consolidada com diagnóstico de diretórios, retenção e sugestões de mapeamento."""

    backups: DirectoryHealth = Field(..., description="Saúde e métricas do diretório de backups")
    attachments: DirectoryHealth = Field(..., description="Saúde e métricas do diretório de anexos")
    backup_retention_days: int = Field(default=30, description="Dias de retenção para limpeza de backups antigos")
    detected_suggestions: list[StorageSuggestion] = Field(
        default_factory=list,
        description="Sugestões detectadas automaticamente no host (ex: Google Drive offline no Windows)"
    )


class StorageConfigUpdate(BaseModel):
    """Payload para atualização e teste de novos diretórios de armazenamento."""

    backups_dir: str = Field(..., min_length=1, max_length=500, description="Caminho da pasta de backups")
    attachments_dir: str = Field(..., min_length=1, max_length=500, description="Caminho da pasta de anexos")
    backup_retention_days: int = Field(default=30, ge=1, le=3650, description="Dias de retenção de backups")
