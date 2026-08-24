# Status do Projeto (STATUS.md)

Este documento registra o progresso consolidado de desenvolvimento do **Wallet**, os módulos finalizados e o roadmap de evolução.

---

## 🚀 Visão Geral das Fases

| Fase | Escopo | Status |
| :--- | :--- | :--- |
| **Fase 1** | Backend FastAPI + SQLite WAL + Sync Google Sheets + Web App React 19 + Gestão Completa | **100% CONCLUÍDO** |
| **Fase 2** | Aplicativo Mobile Android (Nativo/Multiplataforma) + Controle Offline | **PLANEJADO** |

---

## 📋 Checklist Detalhado de Implementação

### Fase 1: Plataforma Web & Backend (Concluída)

- [x] **Arquitetura Base e Persistência**:
  - [x] Backend assíncrono em FastAPI (Python 3.10+) com documentação Swagger/OpenAPI.
  - [x] Banco de dados SQLite local com `PRAGMA journal_mode = WAL` e suporte a concorrência assíncrona via `aiosqlite`.
  - [x] Modelos de dados completos: `User`, `Account`, `PaymentMethod`, `Category`, `Item`, `Contact`, `Goal`, `Debt`, `Budget`, `Transaction`, `Schedule`, `SystemConfig`, `SyncLog`.
  - [x] Valores monetários representados estritamente em centavos inteiros (`amount_cents: int`).
  - [x] Migrações dinâmicas de inicialização e seeds automáticos de categorias, contas, formas de pagamento e credenciais padrão.

- [x] **Autenticação & Gestão de Usuários**:
  - [x] Autenticação via JWT (OAuth2 Password Bearer) e hash seguro com bcrypt/passlib.
  - [x] Tela de login direto com tema dinâmico (**Modo Escuro** ou **Modo Claro**) configurável.
  - [x] Cadastro e gerenciamento seguro de usuários movido para a aba **Configurações &gt; Gestão de Usuários**.
  - [x] Proteção contra auto-exclusão e contra exclusão do último administrador do sistema.

- [x] **Navegação & Painel de Configurações Unificado**:
  - [x] Barra superior com 3 seções principais: **Dashboard**, **Lançamentos** e **Configurações**.
  - [x] Painel de **Configurações & Cadastros** com 11 abas integradas:
    - `Categorias` (Gestão de categorias planas com classificação de essencialidade/natureza)
    - `Itens` (Cadastro de itens rápidos com valores sugeridos para lançamentos)
    - `Contas & Carteiras` (Contas correntes, poupanças, investimentos e caixas)
    - `Formas de Pagamento` (Gestão de instrumentos de pagamento: Pix, Boleto, Cartões, Dinheiro, Transferência e Débito Automático)
    - `Contatos` (Clientes, fornecedores, colaboradores e favorecidos com CPF/CNPJ e anotações)
    - `Dívidas & Passivos` (Controle de passivos com barra de amortização progressiva)
    - `Orçamentos & Metas` (Tetos mensais por categoria com alertas de consumo normal, atenção e estourado)
    - `Sincronização Nuvem` (Configuração e espelhamento em 8 abas no Google Sheets)
    - `Comprovantes & Anexos` (Gestão de diretório físico local/rede, migração e métricas de armazenamento)
    - `Gestão de Usuários` (Cadastro seguro de novos usuários e controle de acesso)
    - `Aparência & Temas` (Alternância de tema claro/escuro global e tema da tela de login)
  - [x] **Ordenação Alfabética Obrigatória (A a Z)** aplicada a todas as listagens e menus suspensos (Categorias, Itens, Contas, Formas de Pagamento, Contatos, Dívidas, Orçamentos e Usuários).

- [x] **Gestão Financeira & Lançamentos**:
  - [x] Dashboard com KPIs de Realizado, A Vencer, Projeção Final do Mês e maiores despesas por categoria.
  - [x] Tela de Lançamentos com **Sistema Dinâmico de Períodos** (Presets: Mês, Hoje, Esta Semana, Próx. 7/30 Dias, Ano Todo, Todas as Datas, Personalizado) e navegador de meses (`<` e `>`).
  - [x] **Atalhos Inteligentes & Alerta de Contas Atrasadas**: Banner dinâmico com valor pendente e filtro em 1 clique para todas as contas vencidas na história.
  - [x] **Busca Textual Global Instantânea**: Filtragem live por descrição, categoria, conta bancária, forma de pagamento, contato, valor e anotações.
  - [x] **Filtros Multi-Critério**: Status (`Todos`, `Abertas`, `Liquidadas`, `Atrasadas`), Tipo (`Despesas`, `Receitas`), Conta/Carteira, Forma de Pagamento e Categoria com ordenação A-Z e botão para limpar filtros.
  - [x] **Entrada e Exibição de Datas em Formato Brasileiro (`DD/MM/AAAA`)**:
    - [x] Input de vencimento no modal de lançamentos com máscara progressiva `dd/mm/aaaa`, validação estrita de calendário e seletor nativo de calendário integrado.
    - [x] Exibição formatada em `DD/MM/AAAA` na tabela de lançamentos.
  - [x] Lançamentos Únicos, Parcelados (em N vezes com badges `1/12`) e Recorrentes mensais com suporte a Forma de Pagamento opcional.
  - [x] **Edição Completa de Lançamentos Cadastrados**:
    - [x] Botão de edição (`Pencil`) na coluna de ações da tabela de lançamentos.
    - [x] Modal unificado [TransactionModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/TransactionModal.tsx) com detecção de modo criação vs. edição, pré-carregamento total de campos, alteração de status (Pendente / Liquidado com data de quitação) e gestão em tempo real de comprovantes.
    - [x] Endpoint `PUT /api/v1/transactions/{id}` atualizado com suporte atômico a tipo, anexos e atualização de `sync_status = "PENDENTE"`.
  - [x] **Liquidação, Apresentação da Data de Ação & Desmarcação de Transações**:
    - [x] **Apresentação Visual da Data de Ação**: Ao marcar como recebido ou pago, a tabela de lançamentos exibe com destaque a data efetiva da ação (`Recebido: DD/MM/AAAA` ou `Pago: DD/MM/AAAA`) com badge e ícone `CheckCircle2`, mantendo a data de vencimento informada abaixo.
    - [x] **Desmarcação em 1 Clique (Toggle / Reabrir)**: Botão de status interativo na tabela permitindo desmarcar qualquer recebimento ou pagamento e retornar para `PENDENTE` instantaneamente, com restauração automática de saldo devedor em dívidas vinculadas.
    - [x] **Endpoints Backend**: `PATCH /api/v1/transactions/{id}/uncomplete` e `PATCH /api/v1/transactions/{id}/toggle-status` com suporte a recarga atômica de relacionamentos e concorrência assíncrona.

- [x] **Sincronização Direta Mobile & Arquitetura Offline-First (FastAPI + Room Database)**:
  - [x] **Endpoints REST Dedicados para o Aplicativo Android**:
    - [x] Endpoint `GET /api/v1/sync/status` com métricas em tempo real de status da API, banco SQLite WAL e saúde do storage de comprovantes.
    - [x] Endpoint `GET /api/v1/sync/mobile/pull` exportando dados mestres consolidados (categorias, contas, cartões, formas de pagamento, itens, contatos, dívidas, orçamentos, metas) e transações delta (`since=[ISO_TIMESTAMP]`).
    - [x] Endpoint `POST /api/v1/sync/mobile/push` para ingestão em lote idempotente de lançamentos criados ou alterados offline no Room Database, preservando os UUIDs gerados no cliente.
    - [x] Auditoria detalhada de sincronizações em `sync_logs` com limpeza em 1 clique (`DELETE /api/v1/sync/logs`).
  - [x] **Desacoplamento Total de Terceiros**:
    - [x] Remoção integral das dependências do Google Sheets e Google Drive API.
    - [x] Dados 100% sob controle local do usuário com privacidade absoluta e comunicação direta.
  - [x] **Interface Web & Central Mobile**:
    - [x] Botão dinâmico e popover no cabeçalho [Header.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/Header.tsx) com status da API REST e métricas operacionais.
    - [x] Nova aba executiva **Configurações > App Mobile & API** em [Settings.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/pages/Settings.tsx) com URLs base para emulador (`http://10.0.2.2:8000/`), rede local Wi-Fi e VPN/Tailscale, teste de conectividade e histórico de auditoria.
    - [x] Modal interativo [MobileAppGuideModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/MobileAppGuideModal.tsx) com 4 passos visuais (Arquitetura Offline-First, Conexão REST, Sincronização WorkManager e Câmera/Biometria).

- [x] **Gestão de Comprovantes & Armazenamento em Diretório Customizado (Local-First)**:
  - [x] **Armazenamento Local Primário Instantâneo com Diretório Customizável**:
    - [x] Modelo `Attachment` no SQLite WAL com particionamento inteligente em disco: `{storage_dir}/{profile}/{ano}/{mes}/`.
    - [x] Suporte a definição de qualquer diretório base (disco local, HD externo, pasta na rede ou sincronizada) persistido em `SystemConfig("storage_directory")`.
    - [x] Endpoints `GET /api/v1/attachments/storage-dir`, `POST /api/v1/attachments/storage-dir` e `POST /api/v1/attachments/storage-dir/reset`.
    - [x] Migração e cópia automática em lote de comprovantes existentes ao alternar o diretório, com validação de permissões de escrita e cálculo de espaço livre em disco.
    - [x] Fallback inteligente para o diretório padrão original caso algum arquivo antigo não tenha sido migrado.
    - [x] Suporte completo a fotos (JPG, PNG, WEBP, HEIC) e documentos fiscais/recibos em PDF até 15MB.
    - [x] Resposta de upload e leitura ultrarrápida (< 50ms).
  - [x] **Tipificação de Anexos (Comprovante, Nota Fiscal, Fatura, Recibo, Contrato, Outro)**:
    - [x] Campo `attachment_type` no modelo `Attachment` com `CheckConstraint` e índice dedicado.
    - [x] Migração dinâmica no startup com `ALTER TABLE attachments ADD COLUMN attachment_type`.
    - [x] Endpoints `POST /upload` e `GET /attachments` com suporte a filtro por tipo e `PATCH /attachments/{id}` para edição imediata.
    - [x] Seletor rápido de tipo de documento no modal de lançamentos [TransactionModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/TransactionModal.tsx) e visualizador [AttachmentViewerModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/AttachmentViewerModal.tsx).
    - [x] Badges visuais coloridos e tooltips com detalhamento de tipos na tabela de lançamentos [Transactions.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/pages/Transactions.tsx).
  - [x] **Interface do Usuário (Frontend)**:
    - [x] Painel de **Armazenamento de Anexos & Comprovantes** na aba **Configurações > Sincronização Nuvem**:
      - [x] Indicador de diretório ativo com badge de gravação (`✓ Gravável & Ativo`).
      - [x] Indicador de `Diretório Padrão` vs. `Diretório Personalizado`.
      - [x] Métricas de contagem total de arquivos, espaço ocupado e espaço livre na partição do disco.
      - [x] Formulário para alteração de diretório com checkbox de migração automática e botão para restaurar o diretório padrão.
    - [x] Modal e lightbox interativo [AttachmentViewerModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/AttachmentViewerModal.tsx) com zoom, rotação, visualizador embutido de PDF, download direto e exclusão.
    - [x] Área de upload no modal de lançamentos [TransactionModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/TransactionModal.tsx) com miniaturas dos comprovantes carregados antes de salvar.
    - [x] Indicador de clipe 📎 com contagem na tabela de lançamentos [Transactions.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/pages/Transactions.tsx) e abertura instantânea do visualizador.

- [x] **Otimização de Espaço & Layout para Monitores Full HD (1920x1080) e Ultrawide**:
  - [x] Expansão do contêiner global (`max-w-[1780px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10`) no cabeçalho [Header.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/Header.tsx) e [App.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/App.tsx), eliminando espaços mortos laterais.
  - [x] Dashboard com cards de KPI em proporções balanceadas e maiores despesas por categoria distribuídas em grid responsivo de 2 colunas (`grid grid-cols-1 xl:grid-cols-2`).
  - [x] Tabela de Lançamentos com padding executivo (`py-3.5 px-4 xl:px-6`), cards KPI ampliados e toolbar de períodos e filtros alinhados sem quebras de linha.
  - [x] Painel de Configurações & Cadastros com sidebar ajustada (`lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]`) e listagens em 2 a 3 colunas responsivas para Categorias, Itens, Contas, Contatos, Dívidas, Orçamentos e Gestão de Usuários.
  - [x] Modais de Lançamentos ([TransactionModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/TransactionModal.tsx)) e Visualizador de Anexos ([AttachmentViewerModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/AttachmentViewerModal.tsx)) ampliados para telas de alta resolução.

- [x] **Formas de Pagamento & Desacoplamento Bancário**:
  - [x] Criação da entidade `PaymentMethod` (Pix, Boleto, Cartão de Crédito, Cartão de Débito, Dinheiro Físico, Transferência, Débito Automático).
  - [x] Aba dedicada em **Configurações > Formas de Pagamento** com ordenação A a Z e modal de edição.
  - [x] Campo opcional `payment_method_id` integrado nos modelos `Transaction` e `Schedule`.
  - [x] Filtro de forma de pagamento na tabela de lançamentos e coluna visual identificando o meio de pagamento.
  - [x] Registrado no [ADR 004](file:///home/jsilvaneto/projetos/wallet/.ai/DECISIONS/004-desacoplamento-contas-e-formas-de-pagamento.md).

- [x] **Gestão de Cartões de Crédito, Faturas & Liquidação Consolidada**:
  - [x] Modelo `CreditCard` com limite total (`limit_cents`), dia de fechamento (`closing_day`), dia de vencimento (`due_day`), cor visual, bandeira e conta de débito padrão.
  - [x] Cálculo dinâmico de limites em tempo real (`used_limit_cents` e `available_limit_cents`) baseado em despesas pendentes no cartão.
  - [x] Aba **Configurações > Cartões de Crédito** com renderização de cartões virtuais em degradê, barra de progresso de limite, estatísticas e botão **Ver Faturas**.
  - [x] Distribuição automática de compras à vista e parceladas (em N vezes) pelas faturas dos meses futuros (`invoice_month`, `invoice_year`).
  - [x] Dica inteligente de "Melhor dia de compra" no modal de lançamentos quando a compra ocorre no ou após o fechamento do cartão.
  - [x] Componente modal interativo [CreditCardInvoicesModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/CreditCardInvoicesModal.tsx) para navegação mês a mês, detalhamento de compras, status da fatura (Aberta, Fechada, Paga) e liquidação consolidada.
  - [x] **Liquidação da Fatura em 1 Clique**: Baixa atômica em todos os itens da fatura (`status = "CONCLUIDO"`) e geração de um único lançamento bancário consolidado (`is_invoice_payment = 1`), recompondo imediatamente o limite do cartão.
  - [x] **Reabertura de Fatura**: Estorno e desfazimento do pagamento da fatura com remoção da transação bancária e retorno dos itens para pendente.
  - [x] Filtro por Cartão de Crédito na tabela de lançamentos e badge visual na listagem.
  - [x] Registrado no [ADR 005](file:///home/jsilvaneto/projetos/wallet/.ai/DECISIONS/005-gestao-cartoes-credito-faturas.md).

- [x] **Extrato e Histórico de Movimentações por Contato (Conta-Corrente Individual)**:
  - [x] Endpoint `GET /api/v1/contacts/{contact_id}/statement` e serviço assíncrono consolidado [contact_service.py](file:///home/jsilvaneto/projetos/wallet/backend/app/services/contact_service.py).
  - [x] Resumo de KPIs financeiros em tempo real: Total Liquidado (pago/recebido), Total Pendente (a pagar/receber), Saldo Líquido Realizado e Saldo Devedor em Dívidas.
  - [x] Componente modal executivo [ContactStatementModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/ContactStatementModal.tsx) com timeline de movimentações, filtros locais (busca, tipo, status) e atalho de novo lançamento para o contato.
  - [x] Ações rápidas no extrato: Toggle de status (baixa/reabrir) em 1 clique e edição de transação integrada ao `TransactionModal`.
  - [x] Botão **Extrato** na aba **Configurações > Contatos & Favorecidos** e links clicáveis na coluna de contatos da tabela de lançamentos.
  - [x] Registrado no [ADR 006](file:///home/jsilvaneto/projetos/wallet/.ai/DECISIONS/006-extrato-conta-corrente-por-contato.md).

- [x] **Transferências Entre Contas Próprias (Movimentação Patrimonial)**:
  - [x] Suporte ao tipo `TRANSFERENCIA` e coluna `destination_account_id` no modelo `Transaction`.
  - [x] Migração automática SQLite preservando integridade de dados e restrições `CHECK`.
  - [x] **Isolamento de Dashboards & Relatórios Operacionais**: Transferências não inflam receitas nem despesas operacionais nos resumos mensais e KPIs.
  - [x] **Seção Dedicada no Modal de Lançamentos**: Seleção intuitiva de Conta de Origem (Saída) e Conta de Destino (Entrada), validação contra contas idênticas e sugestão inteligente de descrição.
  - [x] **Visualização e Filtros Avançados**: Aba `Transferências` no filtro rápido de tipos, badge `⇄ Transferência Interna`, rota de movimentação `[Origem] → [Destino]` e formatação neutra de valor em tom índigo (`⇄ R$`).
  - [x] Registrado no [ADR 007](file:///home/jsilvaneto/projetos/wallet/.ai/DECISIONS/007-transferencias-entre-contas.md).

- [x] **Ações em Lote e Exportação de Relatórios (PDF / CSV)**:
  - [x] Endpoints dedicados em `transactions.py`: `POST /batch/complete`, `POST /batch/uncomplete`, `POST /batch/update` e `POST /batch/delete`.
  - [x] Seleção múltipla na tabela com checkbox mestre no cabeçalho e individuais nas linhas.
  - [x] Barra flutuante de ações em lote com contagem de itens selecionados e atalhos rápidos (**Liquidar**, **Reabrir**, **Editar Campos** e **Excluir**).
  - [x] Modal executivo [BatchEditModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/BatchEditModal.tsx) para atualização seletiva em massa de múltiplos campos (Categoria, Conta/Carteira, Meio de Pagamento, Contato, Data de Vencimento e Observações).
  - [x] Modal de emissão de relatórios [FinancialReportModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/FinancialReportModal.tsx) com layout formal, resumo de KPIs, distribuição analítica por categoria e tabela consolidada.
  - [x] Exportação de **PDF / Impressão** via `@media print` otimizada para folha A4 e download de planilha **CSV** compatível com Excel.
  - [x] Registrado no [ADR 008](file:///home/jsilvaneto/projetos/wallet/.ai/DECISIONS/008-acoes-em-lote-e-exportacao-relatorios.md).

- [x] **Reforma Executiva do Dashboard & Posição Patrimonial**:
  - [x] Endpoint unificado `/api/v1/dashboard/summary` com cálculo dinâmico de saldos em contas e patrimônio líquido instantâneo.
  - [x] Mini-carrossel de saldos individuais por conta e carteira com ícones por tipo (Corrente, Poupança, Investimentos, Caixa).
  - [x] Gráfico histórico interativo de 6 meses com colunas duplas de receitas vs. despesas, saldo líquido e taxa de poupança/margem operacional.
  - [x] Diagnóstico estratégico da Regra 50-30-20 (Gastos Obrigatórios ~50%, Necessários ~30%, Desejos ~20%) com termômetro visual.
  - [x] Widget de monitoramento de tetos orçamentários (`Budgets`) com alertas de consumo (*Normal*, *Atenção*, *Estourado*).
  - [x] Widget de Timeline dos Próximos 7 Dias com **Liquidação Rápida em 1 Clique** direto no Dashboard.
  - [x] Distribuição analítica por Forma de Pagamento (Pix, Boleto, Cartão de Crédito, Débito, Dinheiro).
  - [x] Registrado no [ADR 009](file:///home/jsilvaneto/projetos/wallet/.ai/DECISIONS/009-reforma-executiva-dashboard-analitico.md).

- [x] **Gestão de Metas Financeiras & Reservas (`Goals`)**:
  - [x] Endpoints em `goals.py` (`POST /goals`, `PUT /goals/{id}`, `POST /goals/{id}/contribute`, `DELETE /goals/{id}`, `GET /goals`).
  - [x] Rotinas de aporte (incremento) e resgate (decremento) com atualização automática do status para `CONCLUIDA` ao bater a meta.
  - [x] Aba dedicada em **Configurações > Metas Financeiras** com formulário, busca, filtros de status e cards com cálculo de valor restante.
  - [x] Modais intuitivos para edição e aportes/resgates com alternância dinâmica de tipo.
  - [x] Widget dedicado no **Dashboard** com barras de progresso e percentual de conclusão.
  - [x] Registrado no [ADR 010](file:///home/jsilvaneto/projetos/wallet/.ai/DECISIONS/010-gestao-de-metas-e-objetivos-financeiros.md).

- [x] **Central de Assinaturas, Contratos & Recorrências (`Schedules`)**:
  - [x] Endpoints enriquecidos em `schedules.py` (`GET /schedules`, `POST /schedules`, `POST /schedules/{id}/adjust`, `POST /schedules/{id}/action`, `DELETE /schedules/{id}`).
  - [x] Reajuste inteligente em massa: atualiza valor e dia de vencimento em todos os lançamentos futuros pendentes, preservando 100% do histórico já liquidado.
  - [x] Ações de ciclo de vida: **Pausar**, **Reativar** e **Cancelar** (com remoção limpa de parcelas futuras pendentes).
  - [x] Aba executiva em **Configurações > Assinaturas & Recorrências** com cards informativos, KPIs de custo fixo mensal e receita recorrente, filtros e modal de reajuste.
  - [x] Registrado no [ADR 011](file:///home/jsilvaneto/projetos/wallet/.ai/DECISIONS/011-central-de-assinaturas-e-recorrencias.md).

- [x] **Importador & Conciliação Bancária OFX / CSV (Exclusivo Perfil EMPRESA)**:
  - [x] Parser nativo para extratos `.ofx` (SGML/XML) e `.csv` de bancos brasileiros em `conciliation_service.py`.
  - [x] Endpoint `POST /api/v1/conciliation/parse` com detecção inteligente de duplicidades contra lançamentos existentes e auto-sugestão de categorias e contatos baseada no histórico.
  - [x] Endpoint `POST /api/v1/conciliation/import` para gravação transacional em lote.
  - [x] Regra de segurança: bloqueio de acesso ao recurso para o perfil `PESSOAL` (`HTTP 400`).
  - [x] Modal executivo [ConciliationModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/ConciliationModal.tsx) com KPIs de extrato, tabela de conferência prévia, checkboxes de seleção e edição de campos antes da importação.
  - [x] Botão **Conciliação OFX/CSV** renderizado condicionalmente na barra de ações de [Transactions.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/pages/Transactions.tsx) exclusivamente para `EMPRESA`.
  - [x] Registrado no [ADR 012](file:///home/jsilvaneto/projetos/wallet/.ai/DECISIONS/012-importador-conciliacao-bancaria-pj.md).

- [x] **Backup Consolidado em 1 Clique & Recuperação de Desastres**:
  - [x] Endpoints em `system.py` (`GET /system/stats` e `GET /system/backup`).
  - [x] Rotina atômica com checkpoint WAL de SQLite (`PRAGMA wal_checkpoint(TRUNCATE);`), empacotamento completo de `wallet.db`, pasta `attachments/` e `manifest.json` em arquivo `.ZIP`.
  - [x] Download instantâneo pelo navegador via endpoint assíncrono com limpeza automática de arquivos temporários.
  - [x] Card executivo na aba **Configurações > Comprovantes & Backups** com estatísticas de disco em tempo real e data do último backup.
  - [x] Registrado no [ADR 013](file:///home/jsilvaneto/projetos/wallet/.ai/DECISIONS/013-backup-consolidado-em-1-clique.md).

- [x] **Módulo de Planejamento Financeiro, Projeções & Simulador de Cenários**:
  - [x] Novo menu principal **Planejamento & Futuro** integrado na barra de navegação superior.
  - [x] Endpoints dedicados em `planning.py`: `/projection`, `/simulate`, `/runway`, `/goals-projection` e `/committed-income`.
  - [x] **Fluxo de Caixa Projetado (12M a 24M)**: Saldo acumulado mês a mês com curva patrimonial SVG, alertas de déficit de liquidez e tabela analítica por natureza de despesa.
  - [x] **Simulador de Cenários ("What-If")**: Sliders em tempo real com sensibilidade de receita ($-50\%$ a $+50\%$), corte de gastos de desejos/lazer, gastos necessários e novas obrigações fixas.
  - [x] **Runway & Reserva de Emergência**: Termômetro visual de fôlego de caixa, meta de reserva familiar, regra dos 4% (FIRE) para `PESSOAL` e Burn Rate / Capital de Giro para `EMPRESA`.
  - [x] **Metas com Projeção Temporal**: Cálculo de data de conclusão pelo ritmo médio, aporte mensal necessário e simulação com juros compostos (100% CDI).
  - [x] **Mapa de Comprometimento de Renda**: Análise de renda presa por contratos, dívidas e cartões vs. índice de liberdade financeira.
  - [x] Registrado no [ADR 014](file:///home/jsilvaneto/projetos/wallet/.ai/DECISIONS/014-modulo-de-planejamento-financeiro-e-futuro.md).

- [x] **Ambiente WSL & Scripts**:
  - [x] Script [start.sh](file:///home/jsilvaneto/projetos/wallet/start.sh) automatizado para validação de ambiente e execução paralela com encerramento limpo.

---

### Fase 2: Aplicativo Mobile Android (Pronto para Desenvolvimento no Android Studio)

- [x] **Especificação Técnica & Arquitetura Consolidada**:
  - [x] Documento mestre [.ai/ANDROID_APP.md](file:///home/jsilvaneto/projetos/wallet/.ai/ANDROID_APP.md) atualizado com stack Kotlin 2.0 + Jetpack Compose + Material 3 + Room + Retrofit + WorkManager.
  - [x] Mapeamento detalhado de DTOs e entidades `@Entity` Room com tipagem estrita de valores em centavos (`amount_cents: Long`).
  - [x] Definição de contratos de API REST assíncronos (`WalletApiService`).
  - [x] Estratégia de sincronização offline-first e fila de segundo plano com WorkManager.
  - [x] Fluxos de telas (Quick Entry, Dashboard, Extrato, Cartões e Faturas, Configuração de Servidor e Biometria).
  - [x] Estrutura de pacotes recomendada e permissões do `AndroidManifest.xml`.
- [ ] **Implementação no Android Studio**:
  - [ ] Criação do projeto base (Empty Compose Activity).
  - [ ] Configuração do Room Database local com DAOs.
  - [ ] Camada de rede Retrofit com interceptor JWT.
  - [ ] Interface declarativa Jetpack Compose (Tema Dark/Light, Hero de Valores BRL, Chips e Grid).
  - [ ] Sincronização offline e envio de comprovantes com CameraX.
