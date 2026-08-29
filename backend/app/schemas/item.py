from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional

ProfileType = Literal["PESSOAL", "EMPRESA"]

class ItemBase(BaseModel):
    category_id: str = Field(..., description="ID da categoria vinculada")
    name: str = Field(..., min_length=1, max_length=100, description="Nome do item")
    default_amount_cents: Optional[int] = Field(None, ge=0, description="Valor padrão em centavos")

class ItemCreate(ItemBase):
    profile: ProfileType = Field(..., description="Perfil do item")

class ItemUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    default_amount_cents: Optional[int] = Field(None, ge=0)

class ItemResponse(ItemBase):
    id: str
    profile: ProfileType
    category_name: Optional[str] = None
    category_type: Optional[str] = None
    category_nature: Optional[str] = None
    created_at: str

    model_config = ConfigDict(from_attributes=True)
