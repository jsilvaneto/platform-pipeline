from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Nome de usuário")

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Senha com no mínimo 6 caracteres")

class UserResponse(UserBase):
    id: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    username: str
    password: str

class UserPasswordUpdate(BaseModel):
    password: str = Field(..., min_length=6, description="Nova senha com no mínimo 6 caracteres")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None

