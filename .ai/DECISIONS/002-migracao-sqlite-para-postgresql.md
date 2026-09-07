# ADR 002: Migração de Banco de Dados de SQLite WAL para PostgreSQL

## Status
Aprovado

## Contexto
A arquitetura inicial adotou SQLite com modo WAL (`aiosqlite`) para simplificar a prototipagem e a inicialização local sem dependência de serviços externos. Com o avanço do projeto, a necessidade de suportar concorrência real de múltiplas escritas simultâneas, integridade referencial avançada, pool de conexões robusto, tipos de dados ricos (UUID nativo, JSONB, índices parciais e full-text search) e escalabilidade em produção exigiu a transição para um SGBD corporativo.

## Decisão
1. **Banco de Dados**: Migração completa da camada de persistência para o **PostgreSQL 16**.
2. **Driver Assíncrono**: Adoção do `asyncpg` como driver primário para o SQLAlchemy 2.0 Async (`postgresql+asyncpg://...`), com inclusão do `psycopg2-binary` para tooling e migrações.
3. **Pool de Conexões**: Configuração de connection pool otimizado no `AsyncEngine` (`pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`, `pool_recycle=300`).
4. **Orquestração Containerizada**:
   - Inclusão do container `postgres:16-alpine` no `docker-compose.yml` e no `docker-compose.dev.yml` com healthcheck nativo (`pg_isready`).
   - Dependência explícita do backend com condição `service_healthy`.
5. **Automação no Script Local**: Suporte no `start.sh` para verificação e inicialização automática do container PostgreSQL durante execução em modo nativo.
6. **Governança e Documentação**: Criação de manuais exaustivos de desenvolvimento (.ai/ARCHITECTURE.md, .ai/BACKEND_GUIDE.md, .ai/FRONTEND_GUIDE.md) para apoiar desenvolvedores humanos e agentes de IA.

## Consequências
- **Positivas**:
  - Eliminação de concorrência com bloqueio em escritas simultâneas (*database table lock* do SQLite).
  - Suporte completo a transações ACID de alto throughput.
  - Facilidade de deploy em ambientes de nuvem (AWS RDS, Supabase, Neon, DigitalOcean Managed DB) apenas alterando a variável `DATABASE_URL`.
  - Healthcheck ativo verificando conectividade real com `SELECT 1`.
- **Considerações**:
  - Requer o serviço do PostgreSQL em execução (gerenciado automaticamente pelo Docker Compose).
