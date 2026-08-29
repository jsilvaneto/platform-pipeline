from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

ProfileType = Literal["PESSOAL", "EMPRESA"]
SyncStatusType = Literal["PENDENTE", "SINCRONIZADO", "ERRO", "LOCAL_ONLY"]
AttachmentType = Literal["COMPROVANTE", "NOTA_FISCAL", "FATURA", "RECIBO", "CONTRATO", "OUTRO"]

class AttachmentBase(BaseModel):
    profile: ProfileType
    transaction_id: Optional[str] = None
    file_name: str
    file_size_bytes: int
    mime_type: str
    attachment_type: AttachmentType = "COMPROVANTE"

class AttachmentUpdate(BaseModel):
    attachment_type: Optional[AttachmentType] = None
    file_name: Optional[str] = None

class AttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    profile: ProfileType
    transaction_id: Optional[str] = None
    file_name: str
    file_path: str
    file_size_bytes: int
    mime_type: str
    attachment_type: AttachmentType = "COMPROVANTE"
    drive_file_id: Optional[str] = None
    drive_web_view_link: Optional[str] = None
    drive_folder_id: Optional[str] = None
    sync_status: SyncStatusType = "PENDENTE"
    sync_error: Optional[str] = None
    created_at: str
    synced_at: Optional[str] = None

    # URLs convenientes
    download_url: Optional[str] = None
    file_url: Optional[str] = None
    formatted_size: Optional[str] = None

class AttachmentStatsResponse(BaseModel):
    total_count: int = 0
    total_size_bytes: int = 0
    formatted_total_size: str = "0 B"
    active_directory: str = ""
    default_directory: str = ""
    is_custom_directory: bool = False
    is_writable: bool = True
    free_space_bytes: Optional[int] = None
    formatted_free_space: Optional[str] = None
    synced_count: int = 0
    pending_count: int = 0
    error_count: int = 0

class StorageDirectoryConfigRequest(BaseModel):
    directory_path: str = Field(..., description="Caminho absoluto do diretório onde os anexos serão gravados e lidos")
    migrate_existing: bool = Field(True, description="Se verdadeiro, copia os arquivos existentes do diretório antigo para o novo")

class StorageDirectoryConfigResponse(BaseModel):
    active_directory: str
    default_directory: str
    is_custom: bool
    is_writable: bool
    free_space_bytes: Optional[int] = None
    formatted_free_space: Optional[str] = None
    migrated_count: int = 0
    message: str

class DriveFolderConfigRequest(BaseModel):
    folder_id_or_url: str = Field(..., description="ID ou Link da pasta no Google Drive")

class DriveFolderConfigResponse(BaseModel):
    folder_id: Optional[str] = None
    folder_url: Optional[str] = None
    folder_name: Optional[str] = None
    is_valid: bool = False
    message: str = ""

class DriveSyncTriggerResponse(BaseModel):
    success: bool
    message: str
    total_processed: int = 0
    synced_count: int = 0
    failed_count: int = 0
    errors: list[str] = Field(default_factory=list)

