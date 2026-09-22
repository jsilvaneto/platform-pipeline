from datetime import datetime, timezone
from sqlalchemy import String, Boolean, BigInteger, Text, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class WalletRecordLabel(Base):
    """Tabela associativa Many-to-Many entre registros e etiquetas."""
    __tablename__ = "record_labels"

    record_id: Mapped[str] = mapped_column(String(36), ForeignKey("records.id", ondelete="CASCADE"), primary_key=True)
    label_id: Mapped[str] = mapped_column(String(36), ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True)


class WalletRecord(Base):
    """Transação financeira real sincronizada da API Wallet (receita, despesa ou transferência)."""
    __tablename__ = "records"
    __table_args__ = (
        CheckConstraint(
            "record_type IN ('RECEITA', 'DESPESA', 'TRANSFERENCIA')",
            name="chk_record_type"
        ),
        CheckConstraint(
            "record_state IN ('reconciled', 'cleared', 'uncleared', 'void', 'waitForAssign')",
            name="chk_record_state"
        ),
        Index("ix_records_user_date", "user_id", "record_date"),
        Index("ix_records_user_type_date", "user_id", "record_type", "record_date"),
        Index("ix_records_user_account", "user_id", "account_id"),
        Index("ix_records_user_category", "user_id", "category_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)

    record_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency_code: Mapped[str] = mapped_column(String(10), default="BRL", nullable=False)
    converted_amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)

    record_date: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    record_state: Mapped[str] = mapped_column(String(20), default="cleared", nullable=False, index=True)
    counter_party: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(30), default="rest", nullable=False)

    is_transfer: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    transfer_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    other_account_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    other_record_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    created_at_api: Mapped[str | None] = mapped_column(String(40), nullable=True)
    updated_at_api: Mapped[str | None] = mapped_column(String(40), nullable=True)

    created_at: Mapped[str] = mapped_column(String(40), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        String(40),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False
    )

    # Relacionamentos
    user = relationship("User", backref="records", lazy="selectin")
    account = relationship("WalletAccount", back_populates="records", lazy="selectin")
    category = relationship("Category", lazy="selectin")
    labels = relationship("WalletLabel", secondary="record_labels", lazy="selectin")
