# ADR 008: Ações em Lote e Exportação de Relatórios Financeiros (PDF / CSV)

## Status
Aceito

## Contexto
O usuário precisava agilizar a conferência e gestão diária de lançamentos financeiros, permitindo selecionar múltiplos lançamentos na tabela para liquidar, reabrir, alterar campos em massa (categoria, conta bancária, forma de pagamento, contato ou data de vencimento) e excluir em lote, além de exportar a listagem filtrada em formato executivo PDF e planilha CSV.

## Decisão
1. **Endpoints de Processamento em Lote (Backend)**:
   - `POST /api/v1/transactions/batch/complete`: Liquida em lote os lançamentos selecionados (`status = "CONCLUIDO"`, `payment_date`), abatendo dívidas ativas se houver.
   - `POST /api/v1/transactions/batch/uncomplete`: Reabre em lote os lançamentos selecionados (`status = "PENDENTE"`, `payment_date = None`), restaurando saldos de dívida se houver.
   - `POST /api/v1/transactions/batch/update`: Atualiza campos selecionados em massa (`category_id`, `account_id`, `payment_method_id`, `contact_id`, `due_date`, `payment_date`, `notes`) de forma atômica e segura.
   - `POST /api/v1/transactions/batch/delete`: Remove em lote os lançamentos selecionados e limpa dependências.
2. **Seleção Múltipla & Barra Flutuante (Frontend)**:
   - Checkbox mestre no cabeçalho da tabela com suporte a estado indeterminado (`indeterminate`) e checkboxes por linha.
   - Barra flutuante de ações com contagem de selecionados e botões de ação rápida: **Liquidar**, **Reabrir**, **Editar Campos** e **Excluir**.
   - Modal [BatchEditModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/BatchEditModal.tsx) permitindo selecionar individualmente quais campos serão alterados em lote.
3. **Exportação de Relatórios Financeiros Executivos**:
   - Modal [FinancialReportModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/FinancialReportModal.tsx) com layout formal timbrado.
   - Cards de KPIs do período filtrado, distribuição analítica por categoria e tabela completa de movimentações.
   - Botão **Imprimir / Salvar PDF** utilizando regras `@media print` otimizadas para folha A4 limpa sem elementos de interface ou distorções de tema escuro.
   - Botão **Exportar CSV** com codificação UTF-8 BOM e separadores compatíveis com Excel.

## Consequências
- **Positivas**:
  - Economia drástica de tempo em rotinas diárias de conferência, fechamento de mês e conciliação bancária.
  - Capacidade de gerar relatórios em PDF de qualidade executiva para prestação de contas, contabilidade e auditoria.
  - Flexibilidade total para reclassificar lançamentos em lote em múltiplos atributos (não apenas categoria).
- **Negativas**:
  - Nenhuma identificada.
