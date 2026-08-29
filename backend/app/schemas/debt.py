from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional

ProfileType = Literal["PESSOAL", "EMPRESA"]
DebtStatus = Literal["ATIVA", "QUITADA", "CANCELADA"]

class DebtBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=150, description="Título da dívida/financiamento")
    total_amount_cents: int = Field(..., gt=0, description="Valor total da dívida em centavos")
    contact_id: Optional[str] = Field(None, description="Credor/Contato vinculado")
    due_date: Optional[str] = Field(None, description="Data limite de quitação (YYYY-MM-DD)")

class DebtCreate(DebtBase):
    profile: ProfileType = Field(..., description="Perfil da dívida")
    remaining_amount_cents: Optional[int] = Field(None, description="Saldo devedor inicial (se nulo, assume total)")

class DebtUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    contact_id: Optional[str] = None
    total_amount_cents: Optional[int] = Field(None, gt=0)
    remaining_amount_cents: Optional[int] = Field(None, ge=0)
    due_date: Optional[str] = None
    status: Optional[DebtStatus] = None

class DebtResponse(DebtBase):
    id: str
    profile: ProfileType
    remaining_amount_cents: int
    status: DebtStatus
    created_at: str

    model_config = ConfigDict(from_attributes=True)
