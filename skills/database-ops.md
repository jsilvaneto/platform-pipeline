# Skill: Database Ops (Manutenção, Backups & Diagnóstico PostgreSQL 16)

Esta skill define os procedimentos operacionais para backup, restore, reset de ambiente de desenvolvimento e análise de performance no PostgreSQL 16.

## 1. Backup e Restauração via Docker Compose

### 1.1 Gerar Backup Completo (`pg_dump`)
Gera um dump SQL com estrutura e dados do banco:
```bash
docker compose exec -T postgres pg_dump -U postgres wallet > backup_$(date +%Y%m%d_%H%M%S).sql
```
Para backup comprimido binário (ideal para bancos grandes):
```bash
docker compose exec -T postgres pg_dump -U postgres -Fc wallet > backup_wallet.dump
```

### 1.2 Restaurar Backup
Para restaurar a partir de arquivo SQL:
```bash
docker compose exec -T postgres psql -U postgres -d wallet < backup.sql
```
Para restaurar a partir de dump binário:
```bash
docker compose exec -T postgres pg_restore -U postgres -d wallet --clean --if-exists backup_wallet.dump
```

## 2. Reset e Reseed de Ambiente de Desenvolvimento
Para limpar a base de desenvolvimento e reiniciar as sementes sem derrubar o container:
```sql
-- Executar via psql ou script
TRUNCATE TABLE items, users RESTART IDENTITY CASCADE;
```
Ou recriar as tabelas reexecutando o lifespan:
```bash
docker compose down -v && docker compose up -d
```

## 3. Diagnóstico de Performance e Queries Lentas

### 3.1 Análise de Plano de Execução
Para investigar o custo de uma query e verificar se os índices estão sendo utilizados:
```sql
EXPLAIN (ANALYZE, BUFFERS, COSTS)
SELECT * FROM items WHERE status = 'PENDENTE' ORDER BY created_at DESC LIMIT 20;
```
> **Atenção**: Se o plano exibir `Seq Scan` em tabelas com milhares de registros, considere criar um índice composto (`CREATE INDEX CONCURRENTLY idx_items_status_created ON items (status, created_at DESC);`).

### 3.2 Inspecionar Conexões Ativas no Pool
```sql
SELECT pid, usename, client_addr, state, query_start, query 
FROM pg_stat_activity 
WHERE datname = 'wallet' AND state != 'idle';
```
