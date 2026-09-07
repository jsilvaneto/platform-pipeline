# Skill: API Testing Suite (Testes de Integração com Pytest & HTTPX)

Esta skill guia a implementação de testes assíncronos de ponta a ponta para garantir a estabilidade das rotas, integridade de transações e validação de schemas.

## 1. Estrutura Padrão de Testes (`backend/tests/`)
```
backend/tests/
├── conftest.py           # Fixtures assíncronas do pytest (banco, sessão e cliente HTTP)
├── test_auth.py          # Testes de login, registro e expiração de token
└── test_items.py         # Testes de CRUD, busca e validação de payloads
```

## 2. Padrão de Fixture no `conftest.py`
```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.database import Base, get_db

TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/wallet_test"

@pytest_asyncio.fixture(scope="session")
async def async_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture
async def async_client(async_engine):
    session_factory = async_sessionmaker(bind=async_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
        app.dependency_overrides.clear()
        await session.rollback()
```

## 3. Padrão de Escrita de Testes Assíncronos
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_healthcheck(async_client: AsyncClient):
    response = await async_client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "postgresql"

@pytest.mark.asyncio
async def test_create_item_unauthorized(async_client: AsyncClient):
    payload = {"title": "Novo Item", "status": "PENDENTE"}
    response = await async_client.post("/api/v1/items", json=payload)
    assert response.status_code == 401
```

## 4. Execução dos Testes
Para executar toda a suíte de testes do backend:
```bash
cd backend && pytest tests/ -v
```
Para executar um teste específico:
```bash
cd backend && pytest tests/test_items.py::test_healthcheck -v
```

## 5. Diretriz de Limpeza e Resíduo Zero (Teardown Garantido)
Em conformidade com a regra `test_data_cleanup.md`:
- **Testes Automatizados (Pytest)**: Toda fixture que injeta sessão DEVE aplicar `session.rollback()` ou limpar tabelas no encerramento (`yield` seguido de limpeza/rollback).
- **Testes Manuais ou Scripts Pontuais**:
  - Colete os IDs criados: `created_ids = []`.
  - Use blocos `try...finally`:
    ```python
    try:
        # Criação e teste de endpoints ou funções
        ...
    finally:
        # Exclusão mandatória imediata de todos os registros criados
        async with AsyncSessionLocal() as session:
            await session.execute(delete(Model).where(Model.id.in_(created_ids)))
            await session.commit()
    ```
- **Arquivos Temporários**: Quaisquer arquivos `.json`, scripts de teste temporários ou relatórios de depuração devem ser removidos imediatamente após a execução.
