from typing import Literal
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.category import CategoryResponse

NatureType = Literal["OBRIGATORIO", "NECESSARIO", "DESEJO", "NENHUM"]

class ItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nome padronizado do item de despesa")
    category_id: str = Field(..., min_length=1, description="ID da categoria à qual o item pertence")
    nature: NatureType = Field(default="NECESSARIO", description="Natureza/essencialidade do item")
    is_active: bool = Field(default=True, description="Indica se o item está ativo para novos lançamentos")

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    category_id: str | None = None
    nature: NatureType | None = None
    is_active: bool | None = None

class ItemResponse(ItemBase):
    id: str
    user_id: str
    created_at: str
    updated_at: str
    category: CategoryResponse | None = None

    model_config = ConfigDict(from_attributes=True)
