from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Text, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Item(Base):
    """Modelo Scaffold de exemplo demonstrando entidades relacionais."""
    __tablename__ = "items"
    __table_args__ = (
        CheckConstraint("status IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO')", name="chk_item_status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PENDENTE", index=True, nullable=False)
    
    # Relação opcional com o criador/usuário
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at: Mapped[str] = mapped_column(String(30), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        String(30),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False
    )

    # Relacionamento ORM
    user = relationship("User", backref="items", lazy="selectin")
