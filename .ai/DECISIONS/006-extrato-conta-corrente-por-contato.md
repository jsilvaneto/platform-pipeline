# ADR 006: Extrato e Histórico de Movimentações por Contato (Conta-Corrente Individual)

## Status
Aceito

## Contexto
O usuário precisava de um controle individualizado da relação financeira com cada contato cadastrado (cliente, fornecedor, colaborador ou favorecido), funcionando como uma "conta-corrente do contato". Era necessário saber rapidamente o total já pago/recebido (fluxo realizado), total pendente (fluxo a pagar/receber) e saldo devedor em dívidas/passivos vinculados, além de consultar o extrato detalhado de movimentações com capacidade de alternar status (toggle/baixar/reabrir), editar lançamentos e registrar novos itens para aquele contato.

## Decisão
1. **Modelos e Schemas**:
   - `ContactSummary`: Agregação em centavos inteiros com `total_paid_cents`, `total_received_cents`, `total_pending_pay_cents`, `total_pending_receive_cents`, `net_realized_cents`, `net_pending_cents`, `total_debts_cents`, `remaining_debts_cents`, `transactions_count` e `debts_count`.
   - `ContactStatementResponse`: Contato + Resumo Financeiro Consolidado + Lista de Transações (com comprovantes tipificados) + Lista de Dívidas Ativas.
2. **Serviço e Endpoint**:
   - Criado `backend/app/services/contact_service.py` com `get_contact_statement(...)`.
   - Rota `GET /api/v1/contacts/{contact_id}/statement`.
3. **Componente Modal [ContactStatementModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/ContactStatementModal.tsx)**:
   - Resumo em 4 cards de KPIs da Conta-Corrente (Total Liquidado, Total Pendente, Saldo em Dívidas e Volume de Lançamentos).
   - Banner de anotações/chave PIX/telefone do contato com botão de cópia de CPF/CNPJ.
   - Seção de Dívidas & Passivos com barra de amortização progressiva.
   - Tabela de extrato com filtros por texto, tipo (Despesas / Receitas) e status (Liquidados / Pendentes).
   - Ações rápidas: Toggle de status em 1 clique, Edição Rápida via modal e botão "Novo Lançamento para este Contato".
4. **Integração na Interface**:
   - Botão **Extrato** na aba **Configurações > Contatos & Favorecidos**.
   - Nome do contato interativo e clicável na tabela principal de **Lançamentos**.

## Consequências
- **Positivas**:
  - Visão 360° imediata de qualquer fornecedor ou cliente sem necessidade de filtrar manualmente relatórios complexos.
  - Conciliação ágil com fornecedores (conferência do que foi pago vs. pendente) e clientes (conferência do que foi faturado vs. recebido).
  - Alinhamento pleno com a arquitetura local-first e semântica de centavos inteiros.
- **Negativas**:
  - Nenhuma identificada.
