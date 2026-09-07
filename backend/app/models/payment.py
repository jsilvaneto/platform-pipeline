from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Integer, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Payment(Base):
    """Parcela ou liquidação individual de uma despesa."""
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDENTE', 'CONCLUIDO', 'CANCELADO')",
            name="chk_payment_status"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expense_id: Mapped[str] = mapped_column(String(36), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False, index=True)
    
    installment_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    paid_at: Mapped[str | None] = mapped_column(String(30), nullable=True)         # ISO datetime
    status: Mapped[str] = mapped_column(String(20), default="PENDENTE", index=True, nullable=False)

    created_at: Mapped[str] = mapped_column(String(30), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        String(30),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False
    )

    expense = relationship("Expense", back_populates="payments", lazy="selectin")
