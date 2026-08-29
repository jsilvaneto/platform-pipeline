from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional

ProfileType = Literal["PESSOAL", "EMPRESA"]
GoalStatus = Literal["EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"]

class GoalBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=150, description="Título do objetivo")
    target_amount_cents: int = Field(..., gt=0, description="Valor alvo em centavos")
    target_date: Optional[str] = Field(None, description="Data limite (YYYY-MM-DD)")

class GoalCreate(GoalBase):
    profile: ProfileType = Field(..., description="Perfil da meta")
    current_amount_cents: Optional[int] = Field(0, ge=0, description="Valor já acumulado")

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    target_amount_cents: Optional[int] = Field(None, gt=0)
    current_amount_cents: Optional[int] = Field(None, ge=0)
    target_date: Optional[str] = None
    status: Optional[GoalStatus] = None

class GoalContribute(BaseModel):
    amount_cents: int = Field(..., gt=0, description="Valor do aporte ou resgate em centavos")
    action: Literal["APORTE", "RESGATE"] = Field(default="APORTE", description="APORTE para adicionar ou RESGATE para retirar")

class GoalResponse(GoalBase):
    id: str
    profile: ProfileType
    current_amount_cents: int
    status: GoalStatus
    created_at: str
    progress_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)

