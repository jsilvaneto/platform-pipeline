from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nome da categoria")
    icon: str = Field(default="Tag", max_length=50, description="Nome do ícone da categoria (Lucide)")
    color: str = Field(default="#6366f1", max_length=30, description="Código de cor hexadecimal para a categoria")

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    icon: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=30)

class CategoryResponse(CategoryBase):
    id: str
    user_id: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)
