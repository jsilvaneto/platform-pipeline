from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional

ProfileType = Literal["PESSOAL", "EMPRESA"]
TransactionType = Literal["RECEITA", "DESPESA"]
ScheduleType = Literal["RECORRENTE_CONTINUA", "PARCELADA"]
FrequencyType = Literal["SEMANAL", "MENSAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"]
ScheduleStatus = Literal["ATIVO", "PAUSADO", "FINALIZADO", "CANCELADO"]

class ScheduleBase(BaseModel):
    type: TransactionType = Field(..., description="RECEITA ou DESPESA")
    account_id: Optional[str] = None
    credit_card_id: Optional[str] = None
    category_id: str = Field(..., description="ID da categoria")
    item_id: Optional[str] = None
    contact_id: Optional[str] = None
    debt_id: Optional[str] = None
    payment_method_id: Optional[str] = None
    description: str = Field(..., min_length=1, max_length=255)
    schedule_type: ScheduleType = Field(..., description="RECORRENTE_CONTINUA ou PARCELADA")
    frequency: FrequencyType = Field(default="MENSAL")
    amount_cents: int = Field(..., gt=0, description="Valor da parcela ou recorrência em centavos")
    total_installments: Optional[int] = Field(None, ge=2, description="Obrigatório se PARCELADA")
    start_date: str = Field(..., description="Data do 1º vencimento (YYYY-MM-DD)")
    due_day: int = Field(..., ge=1, le=31, description="Dia padrão de vencimento")

class ScheduleCreate(ScheduleBase):
    profile: ProfileType = Field(..., description="Perfil do plano")

class ScheduleUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    amount_cents: Optional[int] = Field(None, gt=0)
    due_day: Optional[int] = Field(None, ge=1, le=31)
    status: Optional[ScheduleStatus] = None

class ScheduleAdjust(BaseModel):
    new_amount_cents: Optional[int] = Field(None, gt=0, description="Novo valor para parcelas/lançamentos futuros")
    new_due_day: Optional[int] = Field(None, ge=1, le=31, description="Novo dia de vencimento")
    new_description: Optional[str] = Field(None, min_length=1, max_length=255)

class ScheduleAction(BaseModel):
    action: Literal["PAUSAR", "REATIVAR", "CANCELAR"] = Field(..., description="Ação na recorrência")

class ScheduleResponse(ScheduleBase):
    id: str
    profile: ProfileType
    status: ScheduleStatus
    created_at: str
    category_name: Optional[str] = None
    account_name: Optional[str] = None
    credit_card_name: Optional[str] = None
    payment_method_name: Optional[str] = None
    contact_name: Optional[str] = None
    paid_count: int = 0
    pending_count: int = 0
    paid_amount_cents: int = 0
    pending_amount_cents: int = 0
    next_due_date: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
