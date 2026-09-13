from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

AttachmentCategory = Literal[
    "COMPROVANTE_PAGAMENTO",
    "NOTA_FISCAL",
    "FATURA_BOLETO",
    "CONTRATO",
    "OUTRO",
]


class AttachmentBase(BaseModel):
    """Atributos básicos de um anexo."""

    category: AttachmentCategory = Field(
        default="COMPROVANTE_PAGAMENTO",
        description="Classificação/categoria do arquivo anexado"
    )
    notes: str | None = Field(
        default=None,
        max_length=500,
        description="Observações ou descrição detalhada do documento"
    )


class AttachmentResponse(AttachmentBase):
    """Representação serializada de um anexo retornado pela API."""

    id: str = Field(..., description="ID único do anexo")
    user_id: str = Field(..., description="ID do usuário proprietário")
    expense_id: str | None = Field(default=None, description="ID da despesa vinculada se houver")
    payment_id: str | None = Field(default=None, description="ID da parcela vinculada se houver")
    original_filename: str = Field(..., description="Nome original do arquivo enviado")
    content_type: str = Field(..., description="MIME type do arquivo (ex: application/pdf)")
    file_size_bytes: int = Field(..., description="Tamanho do arquivo em bytes")
    file_size_pretty: str = Field(..., description="Tamanho do arquivo legível (ex: 1.25 MB)")
    created_at: str = Field(..., description="Data/hora de criação em formato ISO UTC")
    updated_at: str = Field(..., description="Data/hora da última atualização em formato ISO UTC")

    model_config = ConfigDict(from_attributes=True)


class AttachmentListResponse(BaseModel):
    """Lista paginada ou agrupada de anexos."""

    items: list[AttachmentResponse] = Field(default_factory=list, description="Lista de anexos encontrados")
    total: int = Field(default=0, description="Total de anexos")
