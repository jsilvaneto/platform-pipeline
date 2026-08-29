from pydantic import BaseModel
from typing import Optional

class SystemStatsResponse(BaseModel):
    database_size_bytes: int
    database_size_formatted: str
    total_transactions: int
    total_accounts: int
    total_categories: int
    total_contacts: int
    total_attachments: int
    attachments_size_bytes: int
    attachments_size_formatted: str
    total_backup_size_bytes: int
    total_backup_size_formatted: str
    last_backup_at: Optional[str] = None
    database_path: str
    attachments_path: str
    version: str = "2.4.0"
