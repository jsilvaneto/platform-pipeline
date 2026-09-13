from typing import Literal
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.attachment import AttachmentResponse

PaymentStatus = Literal["PENDENTE", "CONCLUIDO", "CANCELADO"]

class PaymentBase(BaseModel):
    installment_number: int = Field(default=1, ge=1, description="Número da parcela")
    amount_cents: int = Field(..., gt=0, description="Valor monetário da parcela estritamente em centavos")
    due_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Data de vencimento (YYYY-MM-DD)")
    status: PaymentStatus = Field(default="PENDENTE", description="Status da liquidação da parcela")
    paid_at: str | None = Field(default=None, description="Data/hora de liquidação em formato ISO")

class PaymentStatusUpdate(BaseModel):
    status: PaymentStatus
    paid_at: str | None = None

class PaymentUpdate(BaseModel):
    amount_cents: int | None = Field(default=None, gt=0, description="Novo valor monetário da parcela estritamente em centavos")
    due_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Data de vencimento (YYYY-MM-DD)")

class PaymentResponse(PaymentBase):
    id: str
    user_id: str
    expense_id: str
    created_at: str
    updated_at: str
    attachments: list[AttachmentResponse] = []

    model_config = ConfigDict(from_attributes=True)
