from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

PaymentMethodType = Literal[
    "CARTAO_CREDITO",
    "CARTAO_DEBITO",
    "DINHEIRO",
    "PIX",
    "BOLETO",
    "OUTRO"
]

class PaymentMethodBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nome do meio/forma de pagamento")
    type: PaymentMethodType = Field(default="OUTRO", description="Tipo do meio de pagamento")

class PaymentMethodCreate(PaymentMethodBase):
    pass

class PaymentMethodUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    type: PaymentMethodType | None = Field(default=None)

class PaymentMethodResponse(PaymentMethodBase):
    id: str
    user_id: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)
