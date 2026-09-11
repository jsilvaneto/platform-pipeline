from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Integer, Boolean, Text, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Expense(Base):
    """Registro mestre de despesa pessoal."""
    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDENTE', 'CONCLUIDO', 'CANCELADO')",
            name="chk_expense_status"
        ),
        CheckConstraint(
            "essentiality IN ('OBRIGATORIO', 'NECESSARIO', 'DESEJO', 'NENHUM')",
            name="chk_expense_essentiality"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    item_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("items.id", ondelete="RESTRICT"), nullable=True, index=True)
    payment_method_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("payment_methods.id", ondelete="SET NULL"), nullable=True, index=True)

    description: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    total_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    issue_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    due_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)    # YYYY-MM-DD
    essentiality: Mapped[str] = mapped_column(String(20), default="NECESSARIO", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDENTE", index=True, nullable=False)
    
    installments_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[str] = mapped_column(String(40), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        String(40),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False
    )

    # Relationships
    user = relationship("User", backref="expenses", lazy="selectin")
    category = relationship("Category", lazy="selectin")
    item = relationship("Item", back_populates="expenses", lazy="selectin")
    payment_method = relationship("PaymentMethod", lazy="selectin")
    payments = relationship("Payment", back_populates="expense", cascade="all, delete-orphan", lazy="selectin", order_by="Payment.installment_number")
