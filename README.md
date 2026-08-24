# 💼 Wallet - Sistema de Gestão Financeira
 
O **Wallet** é uma plataforma moderna de controle financeiro pessoal e empresarial, desenvolvida para proporcionar total soberania de dados, alta performance e controle granular de receitas, despesas, parcelamentos, faturas de cartão de crédito, dívidas, orçamentos, planejamento financeiro e sincronização em nuvem.

---

## 🚀 Status do Projeto

- **Fase 1 (Backend FastAPI, SQLite WAL, Sync Google Sheets & Frontend Web React 19)**: **100% CONCLUÍDA ✓**
- **Fase 2 (Aplicativo Mobile Android Nativo em Kotlin / Jetpack Compose)**: *Pronto para Início* (Especificação Completa em [.ai/ANDROID_APP.md](.ai/ANDROID_APP.md))

---

## ✨ Principais Funcionalidades

- 🌓 **Perfis Contextuais**: Alternância instantânea entre modo **Pessoal** e modo **Empresa (PJ)** com isolamento completo de categorias, contas, relatórios e permissões.
- 📊 **Dashboard Executivo & Posição Patrimonial**: KPIs em tempo real de Realizado, A Vencer, Projeção Final do Mês, Saldos Consolidados por Conta, Termômetro da Regra 50-30-20, Gráfico Histórico de 6 meses e Timeline dos Próximos 7 Dias com liquidação rápida em 1 clique.
- 💳 **Gestão de Cartões de Crédito & Faturas**: Controle de limites, faturas mensais (Aberta, Fechada, Paga), indicação de melhor dia de compra, parcelamentos automáticos e liquidação consolidada em 1 clique.
- 📎 **Comprovantes & Anexos Local-First**: Armazenamento físico estruturado com suporte a diretório customizado (disco local, HD externo ou rede), visualizador embutido com zoom/rotação/PDF, tipificação de documentos (Comprovante, NF, Fatura, Recibo, Contrato) e migração automática.
- 📈 **Módulo de Planejamento & Futuro**:
  - **Fluxo de Caixa Projetado (12M a 24M)** com curva patrimonial e alertas de liquidez.
  - **Simulador What-If** interativo em tempo real.
  - **Runway & Reserva de Emergência** (Fôlego de caixa, Regra dos 4% FIRE e Burn Rate PJ).
  - **Metas Financeiras** com cálculo de ritmo de aportes e juros compostos.
  - **Mapa de Comprometimento de Renda** por contratos fixos e dívidas.
- 🔄 **Central de Assinaturas, Contratos & Recorrências**: Gestão de custos fixos mensais com reajuste em lote de parcelas futuras e ações de pausar/cancelar.
- 🏦 **Importador & Conciliação Bancária OFX/CSV (PJ)**: Parser inteligente com identificação de duplicidades e auto-sugestão de categorias e contatos.
- ⇄ **Transferências Entre Contas**: Movimentação patrimonial interna sem poluir KPIs de receitas ou despesas.
- 👥 **Extrato de Conta-Corrente por Contato**: Timeline individual de movimentações, saldo líquido e débitos com clientes e fornecedores.
- ⚡ **Ações em Lote & Relatórios**: Edição, baixa e exclusão em massa com exportação formal em **PDF / Impressão** e planilha **CSV**.
- 💾 **Backup Consolidado em 1 Clique**: Empacotamento atômico do banco SQLite WAL (`wallet.db`) e diretório de anexos em arquivo `.ZIP`.
- ☁️ **Sincronização com Google Sheets**: Espelho integral em 8 abas, fila de recepção mobile (`Fila_Mobile`) e indicador dinâmico de alterações pendentes.

---

## 🛠️ Stack Tecnológica

### Backend
- **FastAPI** (Python 3.10+) com arquitetura 100% assíncrona
- **SQLAlchemy 2.0 Async** + **aiosqlite**
- **SQLite** com modo WAL (`Write-Ahead Logging`) e integridade referencial
- **JWT Auth** com hashing nativo `bcrypt`
- **Pydantic v2**
- **Google Sheets API v4 & Google Drive API** via Service Account OAuth2

### Frontend Web
- **React 19** + **TypeScript**
- **Vite 8**
- **Tailwind CSS 3.4** + **Lucide React Icons**
- **Axios** com interceptors de autenticação

### Mobile Android (Fase 2)
- **Kotlin 2.0+** + **Jetpack Compose** + **Material 3**
- **Room SQLite** (Arquitetura Offline-First)
- **Retrofit 2** + **OkHttp 3** + **WorkManager**
- **BiometricPrompt** + **CameraX**

---

## 🏁 Como Executar o Projeto (WSL / Linux)

### Pré-requisitos
- Python 3.10+
- Node.js 18+ e npm
- WSL2 (caso esteja no Windows)

### Inicialização Rápida

Na raiz do repositório, basta rodar:

```bash
./start.sh
```

O script cuidará automaticamente de:
1. Criar o ambiente virtual `backend/venv` e instalar dependências do `requirements.txt`.
2. Instalar os pacotes `node_modules` no frontend via npm (se necessário).
3. Iniciar o servidor backend na porta **8000**.
4. Iniciar o servidor frontend Vite na porta **5173**.
5. Executar o seed inicial de dados caso o banco esteja novo.

---

## 🔑 Acesso Inicial

Abra no seu navegador:
- **Aplicação Web**: [http://localhost:5173](http://localhost:5173)
  - **Usuário Inicial**: `admin`
  - **Senha Inicial**: `admin`
- **Documentação Interativa da API (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📁 Documentação Detalhada (.ai/)

- [.ai/CONTEXT.md](.ai/CONTEXT.md) - Visão geral, objetivos de negócio e regras invariáveis.
- [.ai/ARCHITECTURE.md](.ai/ARCHITECTURE.md) - Arquitetura detalhada, diagramas e tabela consolidada de endpoints REST.
- [.ai/ANDROID_APP.md](.ai/ANDROID_APP.md) - **Especificação Completa e Guia de Implementação do App Android (Fase 2)**.
- [.ai/STATUS.md](.ai/STATUS.md) - Histórico consolidado de releases, checklist detalhado e roadmap.
- [.ai/openapi.json](.ai/openapi.json) - Especificação OpenAPI 3.1 da API REST (gerado automaticamente).
- [.ai/schema.sql](.ai/schema.sql) - Estrutura e DDL do banco de dados SQLite WAL.
- [.ai/DECISIONS/](.ai/DECISIONS/) - Registro de Decisões de Arquitetura (ADRs 001 a 014).
