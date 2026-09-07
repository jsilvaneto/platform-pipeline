# Boilerplate Base / Template Arquitetural Reutilizável

Template base full-stack projetado como matriz reutilizável para acelerar novos projetos e fornecer um ecossistema completo para desenvolvedores e **Agentes de IA**.

---

## 🏛️ Visão Geral da Arquitetura

O boilerplate implementa separação rigorosa de camadas e contratos com tipagem estrita:

- **Backend**: Python 3.10+ com **FastAPI**, **SQLAlchemy 2.0 Async**, banco de dados relacional **PostgreSQL 16** (`asyncpg`), validações **Pydantic v2** e autenticação JWT.
- **Frontend**: **React 19**, **TypeScript** estrito, **Vite**, **Tailwind CSS** (suporte a Tema Claro e Escuro), ícones `lucide-react` e **Axios** com interceptor JWT.
- **Infraestrutura & Containerização**: Docker multi-stage, Nginx Alpine com proxy reverso transparente (`/api/` -> Backend) e orquestração via Docker Compose.
- **Agentes de IA & Skills**: Governança em `.ai/`, manual operacional em `AGENT_RULES.md` e repositório de skills em `.agents/skills/`.

---

## 📁 Estrutura de Diretórios

```text
.
├── .agents/                 # Customizações e Skills para Agentes de IA
│   ├── rules/               # Regras de escopo e qualidade
│   └── skills/              # Guias executáveis de workflows (ex: adicionar entidade)
├── .ai/                     # Governança de contexto para IA (Contexto, Arquitetura, Status)
├── backend/                 # API FastAPI assíncrona
│   ├── app/
│   │   ├── api/v1/          # Endpoints REST (auth, items, health)
│   │   ├── core/            # Configurações e segurança (JWT, bcrypt)
│   │   ├── database.py      # Conexão PostgreSQL 16 (asyncpg pool) e AsyncSessionLocal
│   │   ├── main.py          # Inicialização FastAPI e lifespan
│   │   ├── models/          # Modelos declarativos SQLAlchemy 2.0
│   │   ├── schemas/         # Schemas Pydantic v2
│   │   └── services/        # Camada de lógica de negócios desacoplada
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # SPA React 19 + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── api/             # Cliente Axios com interceptor JWT
│   │   ├── components/      # Componentes UI reutilizáveis (Header, Modal, Layout)
│   │   ├── context/         # AuthContext e ThemeContext
│   │   ├── pages/           # Telas scaffold (Login, Dashboard, Itens)
│   │   ├── types/           # Interfaces TypeScript estritas
│   │   └── utils/           # Formatadores e helpers
│   ├── Dockerfile           # Build multi-stage (Node 20 -> Nginx Alpine)
│   └── nginx.conf           # SPA fallback + Reverse proxy
├── docker-compose.yml       # Orquestração de produção
├── docker-compose.dev.yml   # Orquestração de desenvolvimento com hot-reload
├── start.sh                 # Script universal de inicialização
├── AGENT_RULES.md           # Manual mandatório de desenvolvimento para Agentes de IA
└── .env.example             # Modelo de variáveis de ambiente
```

---

## 🚀 Como Iniciar

### 1. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

### 2. Inicialização Rápida (Script `./start.sh`)

| Modo | Comando | Descrição |
| :--- | :--- | :--- |
| **Produção (Docker)** | `./start.sh` | Constrói e sobe os containers em segundo plano (Backend + Nginx). |
| **Desenvolvimento (Docker)** | `./start.sh --dev` | Sobe os containers com **Hot-Reload** ativo no Backend e Frontend. |
| **Modo Nativo (Local)** | `./start.sh --native` | Cria venv, instala dependências e executa Uvicorn + Vite sem Docker. |
| **Parar Serviços** | `./start.sh --stop` | Encerra os containers com segurança sem perder os dados. |

---

## 🔗 Endpoints Padrão

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Documentação Swagger (Backend)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 🤖 Como Estender via Agentes de IA

Qualquer agente de IA (Antigravity, Gemini, Copilot, etc.) deve consultar obrigatoriamente:
1. [AGENT_RULES.md](file:///home/jsilvaneto/projetos/wallet/projetos/AGENT_RULES.md): Regras de código, convenções e separação de camadas.
2. [.agents/skills/](file:///home/jsilvaneto/projetos/wallet/projetos/.agents/skills/): Catálogo de skills com o passo a passo para estender a aplicação.
3. [.ai/STATUS.md](file:///home/jsilvaneto/projetos/wallet/projetos/.ai/STATUS.md): Roadmap e checklist de features.
