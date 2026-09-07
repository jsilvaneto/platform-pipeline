---
name: database-migrations
description: >-
  Use this skill when the user asks to alter database tables, add columns,
  create indexes, or perform PostgreSQL schema migrations.
---

# Procedimentos de Migração e Evolução de Banco PostgreSQL 16

Este projeto utiliza **PostgreSQL 16** com SQLAlchemy 2.0 Async (`asyncpg`).

## 1. Criação Inicial de Tabelas
Todas as tabelas são criadas automaticamente no startup da aplicação pelo lifespan do FastAPI através do metadata declarativo:
```python
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
```

## 2. Adição de Novas Colunas em PostgreSQL
Para adicionar colunas em tabelas existentes sem interrupção de serviço:
```sql
ALTER TABLE items ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'MEDIA';
```
Ou de forma assíncrona no startup:
```python
async with engine.begin() as conn:
    await conn.execute(text("ALTER TABLE items ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'MEDIA'"))
```

## 3. Criação de Índices Otimizados
No PostgreSQL, sempre crie índices em campos de busca frequente ou chaves estrangeiras:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_status ON items (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_created_at ON items (created_at DESC);
```

## 4. Migrações Estruturadas com Alembic
O projeto possui suporte nativo ao Alembic:
1. Gerar nova revisão de migração automática:
   ```bash
   alembic revision --autogenerate -m "descricao_da_migracao"
   ```
2. Aplicar migrações pendentes:
   ```bash
   alembic upgrade head
   ```
3. Reverter última migração:
   ```bash
   alembic downgrade -1
   ```
