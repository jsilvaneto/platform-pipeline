from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Integer, Text, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Attachment(Base):
    """Documento ou comprovante anexado a despesas ou parcelas de pagamentos."""

    __tablename__ = "attachments"
    __table_args__ = (
        CheckConstraint(
            "category IN ('COMPROVANTE_PAGAMENTO', 'NOTA_FISCAL', 'FATURA_BOLETO', 'CONTRATO', 'OUTRO')",
            name="chk_attachment_category",
        ),
        Index("idx_attachments_user", "user_id"),
        Index("idx_attachments_expense", "expense_id"),
        Index("idx_attachments_payment", "payment_id"),
        Index("idx_attachments_category", "category"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    expense_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=True, index=True
    )
    payment_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("payments.id", ondelete="CASCADE"), nullable=True, index=True
    )

    category: Mapped[str] = mapped_column(
        String(30), default="COMPROVANTE_PAGAMENTO", nullable=False
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_relative_path: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[str] = mapped_column(
        String(40),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False,
    )
    updated_at: Mapped[str] = mapped_column(
        String(40),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False,
    )

    # Relacionamentos
    user = relationship("User", backref="attachments", lazy="selectin")
    expense = relationship("Expense", back_populates="attachments", lazy="selectin")
    payment = relationship("Payment", back_populates="attachments", lazy="selectin")
