# Manual de Desenvolvimento do Backend para Agentes de IA (.ai/BACKEND_GUIDE.md)

Este documento estabelece o guia prático, as regras de código e o passo a passo exato para qualquer **Agente de IA** que precise estender, alterar ou criar novas funcionalidades no **Backend** da aplicação.

---

## 1. Princípios Inegociáveis

1. **Assincronismo Total**: Todas as rotas, dependências e métodos de serviço que interagem com o banco ou I/O devem ser `async def`.
2. **Tipagem Estrita**: É proibido omitir tipagens de parâmetros ou retornos. Utilize `Mapped[...]`, `AsyncSession`, `Sequence[...]` e tipos nativos do Python/Pydantic.
3. **Desacoplamento Rigoroso**:
   - **Models**: Apenas mapeamento ORM declarativo SQLAlchemy 2.0. Proibido conter regras HTTP ou schemas.
   - **Schemas**: Apenas contratos de validação e serialização Pydantic v2. Proibido conter queries SQL.
   - **Services**: Onde reside 100% da lógica de negócios, filtros e transações atômicas (`await db.commit()`).
   - **Routers**: Validação de autenticação/permissões via `deps.py`, injeção de dependências e delegação imediata para a camada de serviço.
4. **PostgreSQL 16**:
   - Conexão assíncrona gerenciada via pool `asyncpg`.
   - Chaves primárias devem ser UUID v4 geradas via `uuid.uuid4()`.
   - Índices em colunas de busca frequente (`index=True`).
   - Chaves estrangeiras com política explícita (`ondelete="CASCADE"` ou `ondelete="SET NULL"`).

---

## 2. Passo a Passo: Como Criar uma Nova Funcionalidade

Ao receber uma solicitação para criar uma nova entidade ou recurso (exemplo: `Category`), siga obrigatoriamente esta sequência:

### Passo 1: Model Declarativo (SQLAlchemy 2.0)
Crie o arquivo em `backend/app/models/category.py`:
```python
from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[str] = mapped_column(String(30), default=lambda: datetime.now(timezone.utc).isoformat(), nullable=False)
    updated_at: Mapped[str] = mapped_column(
        String(30),
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
        nullable=False
    )
```
> **Atenção**: Sempre registre o novo modelo em `backend/app/models/__init__.py` para que o SQLAlchemy o inclua no metadata durante o lifespan:
```python
from app.models.user import User
from app.models.item import Item
from app.models.category import Category

__all__ = ["User", "Item", "Category"]
```

---

### Passo 2: Schemas de Validação (Pydantic v2)
Crie o arquivo em `backend/app/schemas/category.py`:
```python
from pydantic import BaseModel, ConfigDict, Field

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    is_active: bool | None = None

class CategoryResponse(CategoryBase):
    id: str
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)
```
> **Atenção**: Exporte os schemas em `backend/app/schemas/__init__.py`.

---

### Passo 3: Service Layer (Lógica de Negócios e Transações)
Crie o arquivo em `backend/app/services/category_service.py`:
```python
from typing import Sequence
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate

class CategoryService:
    @staticmethod
    async def list_categories(db: AsyncSession) -> Sequence[Category]:
        """Lista todas as categorias ordenadas por nome."""
        query = select(Category).order_by(Category.name.asc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, category_id: str) -> Category:
        """Busca categoria por ID ou lança HTTP 404."""
        query = select(Category).where(Category.id == category_id)
        result = await db.execute(query)
        cat = result.scalar_one_or_none()
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Categoria '{category_id}' não encontrada."
            )
        return cat

    @staticmethod
    async def create_category(db: AsyncSession, category_in: CategoryCreate) -> Category:
        """Cria categoria garantindo unicidade do nome."""
        query = select(Category).where(Category.name == category_in.name.strip())
        existing = (await db.execute(query)).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Já existe uma categoria com o nome '{category_in.name}'."
            )

        category = Category(
            name=category_in.name.strip(),
            description=category_in.description.strip() if category_in.description else None,
            is_active=category_in.is_active
        )
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category

    @staticmethod
    async def delete_category(db: AsyncSession, category_id: str) -> bool:
        """Exclui categoria pelo ID."""
        cat = await CategoryService.get_by_id(db, category_id)
        await db.delete(cat)
        await db.commit()
        return True
```

---

### Passo 4: Roteador HTTP (FastAPI)
Crie o arquivo em `backend/app/api/v1/categories.py`:
```python
from typing import Sequence
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categorias"])

@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Sequence[CategoryResponse]:
    """Lista todas as categorias disponíveis."""
    return await CategoryService.list_categories(db)

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> CategoryResponse:
    """Cria uma nova categoria."""
    return await CategoryService.create_category(db, category_in)
```

> **Atenção**: Registre o novo roteador em `backend/app/api/v1/__init__.py`:
```python
from app.api.v1.categories import router as categories_router
api_router.include_router(categories_router)
```

---

## 3. Padrões de Injeção e Segurança (`deps.py`)

- **Usuário Autenticado**: `current_user: User = Depends(get_current_user)`.
- **Apenas Administradores**: `admin_user: User = Depends(get_current_admin_user)`.
- **Sessão do Banco**: `db: AsyncSession = Depends(get_db)`.

---

## 4. Validação e Testes Locais

Após implementar alterações no backend, execute:
```bash
python3 -m py_compile backend/app/main.py
```
Se não houver saída de erro, a sintaxe e os imports estão íntegros.
