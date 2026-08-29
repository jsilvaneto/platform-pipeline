from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional

ProfileType = Literal["PESSOAL", "EMPRESA"]
AccountType = Literal["CORRENTE", "POUPANCA", "INVESTIMENTO", "CAIXA", "OUTRO"]

class AccountBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nome da conta ou banco")
    type: AccountType = Field(default="CORRENTE", description="Tipo da conta")

class AccountCreate(AccountBase):
    profile: ProfileType = Field(..., description="Perfil do lançamento")

class AccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[AccountType] = None

class AccountResponse(AccountBase):
    id: str
    profile: ProfileType
    created_at: str

    model_config = ConfigDict(from_attributes=True)
