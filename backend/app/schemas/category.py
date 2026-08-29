from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional

ProfileType = Literal["PESSOAL", "EMPRESA"]
CategoryType = Literal["RECEITA", "DESPESA"]
CategoryNature = Literal["NENHUM", "OBRIGATORIO", "NECESSARIO", "DESEJO"]

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nome da categoria")
    type: CategoryType = Field(..., description="Tipo: RECEITA ou DESPESA")
    nature: CategoryNature = Field(default="NENHUM", description="Natureza da despesa/receita: NENHUM, OBRIGATORIO, NECESSARIO, DESEJO")

class CategoryCreate(CategoryBase):
    profile: ProfileType = Field(..., description="Perfil do lançamento")

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[CategoryType] = None
    nature: Optional[CategoryNature] = None

class CategoryResponse(CategoryBase):
    id: str
    profile: ProfileType
    created_at: str

    model_config = ConfigDict(from_attributes=True)
