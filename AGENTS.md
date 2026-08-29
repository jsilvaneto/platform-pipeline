# Diretrizes Operacionais para Agentes de IA (AGENTS.md)

Este documento estabelece as diretrizes mandatórias de desenvolvimento, padrões de código e governança de contexto para qualquer agente de IA ou desenvolvedor atuando no repositório **Wallet**.

---

## 1. Regras Obrigatórias de Inicialização e Finalização

### 1.1 Leitura Obrigatória Pré-Execução
Antes de planejar ou implementar qualquer alteração de código, você **DEVE** ler:
1. [.ai/CONTEXT.md](file:///home/jsilvaneto/projetos/wallet/.ai/CONTEXT.md): Entendimento do domínio, regras de negócio invariáveis e isolamento de perfis (`PESSOAL` e `EMPRESA`).
2. [.ai/STATUS.md](file:///home/jsilvaneto/projetos/wallet/.ai/STATUS.md): Estado atual de implementação, checklist de funcionalidades e histórico de releases.
3. [.ai/ARCHITECTURE.md](file:///home/jsilvaneto/projetos/wallet/.ai/ARCHITECTURE.md): Arquitetura, fluxo de dados e contratos de API.

### 1.2 Atualização Obrigatória Pós-Execução
Ao concluir qualquer tarefa ou entrega de funcionalidade:
1. Atualize o checklist e registre o progresso em [.ai/STATUS.md](file:///home/jsilvaneto/projetos/wallet/.ai/STATUS.md).
2. Se houver nova decisão técnica estrutural, registre um novo ADR em [.ai/DECISIONS/](file:///home/jsilvaneto/projetos/wallet/.ai/DECISIONS/).
3. Atualize [.ai/schema.sql](file:///home/jsilvaneto/projetos/wallet/.ai/schema.sql) e [.ai/openapi.json](file:///home/jsilvaneto/projetos/wallet/.ai/openapi.json) se houver alteração em modelos ou rotas de API.

---

## 2. Padrões de Código e Arquitetura

### 2.1 Backend (Python / FastAPI)
- **Assincronismo Total**: Todas as rotas e interações com o banco devem usar `async def`, `AsyncSession` e `await`.
- **ORM & Banco de Dados**: SQLAlchemy 2.0 moderno com `Mapped[...]`, `mapped_column(...)`, `select(...)` e SQLite configurado com `journal_mode = WAL` e `foreign_keys = ON`.
- **Valores Monetários em Centavos**: Todos os valores financeiros são inteiros (`amount_cents: int`). Nunca utilize float para valores monetários no banco ou schemas.
- **Validações Pydantic V2**: Uso de `BaseModel`, `Field(...)`, `ConfigDict(from_attributes=True)` e `Literal` para enums.
- **Isolamento de Perfis**: Toda query de listagem/criação deve respeitar estritamente o perfil informado (`PESSOAL` ou `EMPRESA`).

### 2.2 Frontend (React 19 / TypeScript / Vite / Tailwind CSS)
- **TypeScript Estrito**: Tipagem estrita de todas as props, interfaces e retornos de API em [types/index.ts](file:///home/jsilvaneto/projetos/wallet/frontend/src/types/index.ts).
- **Design System & Tailwind CSS**:
  - Suporte impecável a **Modo Claro** e **Modo Escuro** (*Dark Mode* de alto contraste).
  - Componentização modular, ícones consistentes via `lucide-react`.
  - Formatação monetária padronizada via helper [formatCurrency](file:///home/jsilvaneto/projetos/wallet/frontend/src/utils/format.ts).
- **Experiência do Usuário (UX)**:
  - Atalhos contextuais (ex: auto-preenchimento de categorias ao selecionar itens).
  - Feedback visual imediato para ações de exclusão, edição e sincronização.

### 2.3 Mobile Android (Kotlin / Jetpack Compose / Room)
- **Valores Monetários em Centavos**: `amountCents: Long` ou `Int`. Nunca utilize `Float` ou `Double` para cálculos financeiros.
- **Offline-First & Room**: Gravações locais instantâneas com `sync_status = "PENDENTE"`. Sincronização em background orquestrada via `WorkManager`.
- **UI Declarativa**: Jetpack Compose com Material 3, tipografia padronizada e suporte a temas Dark/Light.
- **Código**: `camelCase` para métodos/variáveis, `PascalCase` para Composables/Classes/Interfaces.

### 2.4 Convenções de Nomenclatura e Formatação
- **Enums e Constantes no Banco**: Sempre em `UPPERCASE` (ex: `PESSOAL`, `EMPRESA`, `RECEITA`, `DESPESA`, `PENDENTE`, `CONCLUIDO`, `OBRIGATORIO`, `NECESSARIO`, `DESEJO`, `NENHUM`).
- **Cadastros pelo Usuário**: Sugerir e manter cadastros em `Title Case` (ex: *Alimentação*, *Supermercado*, *Aluguel Residencial*).
- **Código**: `snake_case` para Python; `camelCase` e `PascalCase` para TypeScript/React e Kotlin/Compose.

---

## 3. Comandos Principais do Projeto

| Ação | Comando | Descrição |
| :--- | :--- | :--- |
| **Inicialização Completa** | `./start.sh` | Inicia Backend (porta 8000) e Frontend (porta 5173) no WSL com encerramento limpo. |
| **Build do Frontend** | `cd frontend && npm run build` | Valida tipagem TypeScript e gera bundle de produção via Vite. |
| **Build do Android** | `cd android && ./gradlew assembleDebug` | Compila o aplicativo mobile Android e valida o projeto no Gradle. |
| **Execução de Testes** | `./backend/venv/bin/python <script_de_teste>.py` | Executa rotinas de validação de API e banco de dados. |
| **Exportação de Schemas** | `./backend/venv/bin/python scratch/export_metadata.py` | Atualiza `.ai/openapi.json` e `.ai/schema.sql`. |

