from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional

ProfileType = Literal["PESSOAL", "EMPRESA"]

class PaymentMethodBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nome da forma de pagamento (Ex: Pix, Boleto, Cartão de Crédito)")

class PaymentMethodCreate(PaymentMethodBase):
    profile: ProfileType = Field(..., description="Perfil do cadastro (PESSOAL ou EMPRESA)")

class PaymentMethodUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Nome da forma de pagamento")

class PaymentMethodResponse(PaymentMethodBase):
    id: str
    profile: ProfileType
    created_at: str

    model_config = ConfigDict(from_attributes=True)
