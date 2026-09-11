from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Item(Base):
    """Item de despesa padronizado vinculado a uma categoria com natureza intrínseca."""
    __tablename__ = "items"
    __table_args__ = (
        CheckConstraint(
            "nature IN ('OBRIGATORIO', 'NECESSARIO', 'DESEJO', 'NENHUM')",
            name="chk_item_nature"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    nature: Mapped[str] = mapped_column(String(20), default="NECESSARIO", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[str] = mapped_column(String(40), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        String(40),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False
    )

    # Relacionamentos
    user = relationship("User", backref="items", lazy="selectin")
    category = relationship("Category", backref="items", lazy="selectin")
    expenses = relationship("Expense", back_populates="item", lazy="selectin")
