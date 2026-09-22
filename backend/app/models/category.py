from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Category(Base):
    """Categorias e subcategorias financeiras sincronizadas da API Wallet com essencialidade."""
    __tablename__ = "categories"
    __table_args__ = (
        CheckConstraint(
            "cardinality IN ('OBRIGATORIO', 'NECESSARIO', 'DESEJO', 'NENHUM')",
            name="chk_category_cardinality"
        ),
        Index("ix_categories_user_group", "user_id", "group_name"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    group_name: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    cardinality: Mapped[str] = mapped_column(String(20), default="NENHUM", nullable=False)
    icon: Mapped[str] = mapped_column(String(50), default="Tag", nullable=False)
    color: Mapped[str] = mapped_column(String(30), default="#6366f1", nullable=False)
    created_at: Mapped[str] = mapped_column(String(40), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)

    user = relationship("User", backref="categories", lazy="selectin")
    parent = relationship("Category", remote_side=[id], backref="subcategories", lazy="selectin")

