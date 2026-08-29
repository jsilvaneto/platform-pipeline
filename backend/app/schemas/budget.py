from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional

ProfileType = Literal["PESSOAL", "EMPRESA"]

class BudgetBase(BaseModel):
    category_id: str = Field(..., description="ID da categoria")
    month: int = Field(..., ge=1, le=12, description="Mês de 1 a 12")
    year: int = Field(..., ge=2000, le=2100, description="Ano de referência")
    limit_amount_cents: int = Field(..., gt=0, description="Limite máximo em centavos")

class BudgetCreate(BudgetBase):
    profile: ProfileType = Field(..., description="Perfil do orçamento")

class BudgetUpdate(BaseModel):
    limit_amount_cents: Optional[int] = Field(None, gt=0)

class BudgetResponse(BudgetBase):
    id: str
    profile: ProfileType
    created_at: str
    category_name: Optional[str] = None
    spent_amount_cents: int = 0
    remaining_amount_cents: int = 0
    percentage_used: float = 0.0

    model_config = ConfigDict(from_attributes=True)
