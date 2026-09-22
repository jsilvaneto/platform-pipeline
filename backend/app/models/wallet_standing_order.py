from datetime import datetime, timezone
from sqlalchemy import String, Boolean, BigInteger, Integer, Text, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class WalletStandingOrder(Base):
    """Ordens permanentes e pagamentos recorrentes programados com regra RRULE."""
    __tablename__ = "standing_orders"
    __table_args__ = (
        Index("ix_standing_orders_user_due", "user_id", "due_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)

    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency_code: Mapped[str] = mapped_column(String(10), default="BRL", nullable=False)
    record_type: Mapped[str] = mapped_column(String(20), default="DESPESA", nullable=False)
    
    recurrence_rule: Mapped[str] = mapped_column(String(200), nullable=False)
    due_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    payment_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reminder: Mapped[str] = mapped_column(String(30), default="none", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[str] = mapped_column(String(40), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        String(40),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False
    )

    user = relationship("User", backref="standing_orders", lazy="selectin")
    account = relationship("WalletAccount", lazy="selectin")
    category = relationship("Category", lazy="selectin")
    items = relationship("WalletStandingOrderItem", back_populates="standing_order", cascade="all, delete-orphan", lazy="selectin")


class WalletStandingOrderItem(Base):
    """Ocorrência específica gerada no tempo a partir de uma ordem permanente."""
    __tablename__ = "standing_order_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    standing_order_id: Mapped[str] = mapped_column(String(36), ForeignKey("standing_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    
    original_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    aligned_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    paid_date: Mapped[str | None] = mapped_column(String(10), nullable=True, index=True)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    record_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)

    standing_order = relationship("WalletStandingOrder", back_populates="items", lazy="selectin")
