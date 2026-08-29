from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional, List
from app.schemas.transaction import TransactionResponse
from app.schemas.debt import DebtResponse

ProfileType = Literal["PESSOAL", "EMPRESA"]
ContactType = Literal["FORNECEDOR", "CLIENTE", "FUNCIONARIO", "OUTRO"]

class ContactBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nome do contato")
    type: ContactType = Field(..., description="Classificação do contato")
    document: Optional[str] = Field(None, max_length=30, description="CPF ou CNPJ opcional")
    notes: Optional[str] = Field(None, description="Observações gerais")

class ContactCreate(ContactBase):
    profile: ProfileType = Field(..., description="Perfil do lançamento")

class ContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[ContactType] = None
    document: Optional[str] = Field(None, max_length=30)
    notes: Optional[str] = None

class ContactResponse(ContactBase):
    id: str
    profile: ProfileType
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class ContactSummary(BaseModel):
    total_paid_cents: int = Field(0, description="Total pago ao contato (despesas concluídas)")
    total_received_cents: int = Field(0, description="Total recebido do contato (receitas concluídas)")
    total_pending_pay_cents: int = Field(0, description="Total pendente a pagar (despesas pendentes)")
    total_pending_receive_cents: int = Field(0, description="Total pendente a receber (receitas pendentes)")
    net_realized_cents: int = Field(0, description="Saldo líquido realizado (recebido - pago)")
    net_pending_cents: int = Field(0, description="Saldo líquido pendente (a receber - a pagar)")
    total_debts_cents: int = Field(0, description="Valor original total de dívidas ativas")
    remaining_debts_cents: int = Field(0, description="Saldo devedor restante em dívidas ativas")
    transactions_count: int = Field(0, description="Total de lançamentos vinculados")
    debts_count: int = Field(0, description="Total de dívidas ativas vinculadas")

class ContactStatementResponse(BaseModel):
    contact: ContactResponse
    summary: ContactSummary
    transactions: List[TransactionResponse] = []
    debts: List[DebtResponse] = []
