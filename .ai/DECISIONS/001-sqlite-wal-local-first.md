# ADR 001: Persistência com SQLite WAL e SQLAlchemy 2.0 Async

## Status
**Aceito**

## Contexto
O sistema Wallet foi idealizado para oferecer gestão financeira com privacidade absoluta, performance instantânea em ambiente local (desktop/WSL/docker) e sem dependência de bancos de dados hospedados em nuvem com custos recorrentes (como PostgreSQL gerenciado ou AWS RDS). Além disso, o sistema precisa atender a operações assíncronas do FastAPI com alta performance de leitura e escrita simultânea.

## Decisão
1. **Banco Embutido SQLite**: Utilizar o SQLite como motor principal de banco de dados embutido, armazenado localmente em `backend/data/wallet.db`.
2. **Modo WAL (`Write-Ahead Logging`)**: Ativar explicitamente `PRAGMA journal_mode = WAL;` e `PRAGMA synchronous = NORMAL;`, permitindo leituras e escritas concorrentes sem travamento de arquivo.
3. **Integridade Referencial**: Habilitar `PRAGMA foreign_keys = ON;` na inicialização de cada conexão para garantir integridade em cascata e restrições de chaves estrangeiras.
4. **Driver Assíncrono**: Utilizar `aiosqlite` juntamente com SQLAlchemy 2.0 Async (`create_async_engine`, `AsyncSession`), integrando a I/O não bloqueante nativa do FastAPI.
5. **Armazenamento Monetário**: Representar todos os valores monetários como números inteiros em centavos (`amount_cents: int`), eliminando erros de arredondamento inerentes a tipos de ponto flutuante (*floating point*).

## Consequências

### Positivas
- **Privacidade & Soberania**: Os dados financeiros ficam sob posse estrita do usuário em sua máquina local.
- **Velocidade**: Consultas executadas em microssegundos direto em memória/disco local, sem latência de rede.
- **Portabilidade**: Um único arquivo `wallet.db` contém todo o estado do sistema, facilitando backups instantâneos e migração de ambiente.
- **Zero Custo de Infraestrutura**: Não exige contratação de instâncias ou servidores de banco de dados em nuvem.

### Negativas / Mitigações
- O banco local não é diretamente acessível por múltiplos dispositivos remotos sem uma camada de sincronização — mitigado pelo módulo de espelhamento com o Google Sheets (ver ADR 002).
