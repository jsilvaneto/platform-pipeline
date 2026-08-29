# ADR 017: Containerização com Docker, Versionamento Semântico e Governança de Releases

## Data
2026-08-29

## Status
Aprovado e Implementado

## Contexto
Para garantir portabilidade, facilidade de deploy em ambientes locais e servidores, e padronizar o ciclo de entrega de novas versões da plataforma **Wallet**, fez-se necessária a containerização de ponta a ponta dos serviços Web e API, bem como a definição de uma estratégia formal de versionamento semântico (SemVer) e documentação padronizada para cada release antes da expansão do aplicativo Android (Fase 2).

## Decisão
1. **Containerização do Backend**:
   - `backend/Dockerfile`: Base `python:3.10-slim`, isolamento em `/app`, criação de diretório `/app/data` para armazenamento persistente do SQLite WAL e comprovantes fiscais, com `HEALTHCHECK` consultando `/api/health`.

2. **Containerização do Frontend com Proxy Reverso**:
   - `frontend/Dockerfile`: Multi-stage build com `node:20-alpine` para geração dos artefatos de build do Vite/React 19 e `nginx:1.27-alpine` como servidor web leve de produção.
   - `frontend/nginx.conf`: Roteamento SPA (`try_files $uri $uri/ /index.html;`), compressão Gzip e proxy reverso transparente de `/api/` para o container do backend (`http://backend:8000/api/`), eliminando atritos de CORS e simplificando o tráfego HTTP.

3. **Orquestração com Docker Compose**:
   - `docker-compose.yml`: Orquestra os serviços `backend` e `frontend`, rede isolada `wallet_network`, reinicialização automática (`unless-stopped`), dependência com checagem de saúde (`service_healthy`) e volume persistente nomeado `wallet_data`.
   - `docker-compose.dev.yml`: Ambiente de desenvolvimento com hot-reload habilitado via montagem de volumes locais.

4. **Versionamento Semântico (SemVer) e Releases**:
   - Padrão `MAJOR.MINOR.PATCH` registrado no arquivo mestre `VERSION` na raiz do monorepo.
   - `CHANGELOG.md` na raiz do projeto seguindo a convenção internacional *Keep a Changelog*.
   - Documentação aprofundada de cada release salva em `.ai/RELEASES/v<version>.md`.

## Consequências
- Deploy e execução em qualquer ambiente com um único comando (`docker compose up -d --build`).
- Persistência garantida de transações e arquivos em volumes Docker.
- Histórico transparente de mudanças e contratos de versão claros para os clientes Web e Mobile.
