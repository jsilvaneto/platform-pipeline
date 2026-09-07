from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

ItemStatus = Literal["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO"]

class ItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: str | None = None
    status: ItemStatus = "PENDENTE"

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=150)
    description: str | None = None
    status: ItemStatus | None = None

class ItemResponse(ItemBase):
    id: str
    user_id: str | None = None
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)

class ItemFilter(BaseModel):
    status: ItemStatus | None = None
    search: str | None = None
    limit: int = Field(50, ge=1, le=100)
    offset: int = Field(0, ge=0)
