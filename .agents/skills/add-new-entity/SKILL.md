---
name: add-new-entity
description: >-
  Use this skill when the user asks to create a new database entity, model, API endpoint,
  or full-stack feature in the project.
---

# Workflow: Adicionar Nova Entidade Full-Stack

Este guia ensina o passo a passo exato para criar uma nova entidade desde o banco de dados até o frontend, preservando o desacoplamento de camadas e tipagem estrita.

## 1. Passo 1: Criar o Modelo SQLAlchemy 2.0
Crie o arquivo em `backend/app/models/<entidade>.py`:
```python
from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class MinhaEntidade(Base):
    __tablename__ = "minhas_entidades"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nome: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[str] = mapped_column(String(30), default=lambda: datetime.now(timezone.utc).isoformat())
```
Exporte o novo modelo em `backend/app/models/__init__.py`.

## 2. Passo 2: Criar os Schemas Pydantic v2
Crie o arquivo em `backend/app/schemas/<entidade>.py`:
```python
from pydantic import BaseModel, ConfigDict, Field

class EntidadeBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=100)
    descricao: str | None = None
    ativo: bool = True

class EntidadeCreate(EntidadeBase):
    pass

class EntidadeUpdate(BaseModel):
    nome: str | None = Field(None, min_length=1, max_length=100)
    descricao: str | None = None
    ativo: bool | None = None

class EntidadeResponse(EntidadeBase):
    id: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)
```
Exporte os schemas em `backend/app/schemas/__init__.py`.

## 3. Passo 3: Implementar o Service Desacoplado
Crie o arquivo em `backend/app/services/<entidade>_service.py`:
- Incorpore as queries com `select(...)` do SQLAlchemy 2.0.
- Execute transações atômicas com `await db.commit()`.
- Lance `HTTPException(status_code=404, detail="Não encontrado")` quando a entidade não existir.

## 4. Passo 4: Criar o Roteador de API
Crie o arquivo em `backend/app/api/v1/<entidade>.py`:
- Injete dependências: `db: AsyncSession = Depends(get_db)`, `user: User = Depends(get_current_user)`.
- Delegue a lógica para o serviço criado no Passo 3.
- Registre o roteador em `backend/app/api/v1/__init__.py`.

## 5. Passo 5: Criar os Contratos no Frontend
Em `frontend/src/types/index.ts`, adicione a interface:
```typescript
export interface MinhaEntidade {
  id: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  created_at: string;
}
```

## 6. Passo 6: Interface de Usuário
- Crie ou estenda a página em `frontend/src/pages/`.
- Utilize `api.get`, `api.post`, `api.put`, `api.delete` através do cliente centralizado em `frontend/src/api/client.ts`.
- Aplique classes com suporte a Dark/Light Mode via Tailwind CSS.
