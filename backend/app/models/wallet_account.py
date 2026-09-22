from datetime import datetime, timezone
from sqlalchemy import String, Boolean, BigInteger, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class WalletAccount(Base):
    """Contas bancárias, carteiras, cartões e investimentos sincronizados da API BudgetBakers."""
    __tablename__ = "accounts"
    __table_args__ = (
        Index("ix_accounts_user_type", "user_id", "account_type"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    account_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    currency_code: Mapped[str] = mapped_column(String(10), default="BRL", nullable=False)
    
    # Saldos armazenados estritamente em inteiros de centavos (financial-domain-guard)
    initial_balance_cents: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    current_balance_cents: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    credit_balance_cents: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    credit_limit_cents: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    available_credit_cents: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    
    balance_mode: Mapped[str | None] = mapped_column(String(50), nullable=True)
    exclude_from_stats: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    color: Mapped[str] = mapped_column(String(30), default="#2563eb", nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[str] = mapped_column(String(40), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        String(40),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False
    )

    user = relationship("User", backref="accounts", lazy="selectin")
