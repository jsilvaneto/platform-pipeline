# ADR 001: Escolha da Arquitetura Base e Stack Tecnológica

## Status
Aprovado

## Contexto
Para acelerar o desenvolvimento de novos projetos e permitir que tanto desenvolvedores humanos quanto agentes de IA trabalhem com máxima eficiência, segurança de tipos e velocidade de iteração, era necessário definir uma arquitetura padronizada.

## Decisão
1. **Backend**: FastAPI assíncrono com SQLAlchemy 2.0 e Pydantic v2.
2. **Banco de Dados**: SQLite com `PRAGMA journal_mode = WAL` para alta performance local e zero dependência de servidores de banco externos complexos.
3. **Frontend**: React 19 com TypeScript estrito, Tailwind CSS e Vite.
4. **Governança**: Separação clara de camadas (Models, Schemas, Services, Routers, Pages, Components), documentação `.ai/` e skills para agentes de IA em `.agents/skills/`.

## Consequências
- Código altamente legível, testável e manutenível.
- Facilidade de deploy via Docker Compose ou execução nativa leve via script `start.sh`.
- Integração perfeita com agentes de IA através de diretrizes claras em `AGENT_RULES.md` e skills modulares.
