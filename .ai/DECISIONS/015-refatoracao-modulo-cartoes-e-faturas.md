# ADR 015: Refatoração do Módulo de Cartões de Crédito e Ciclo de Faturas

## Data
2026-08-29

## Status
Aprovado e Implementado

## Contexto
Anteriormente, compras realizadas no cartão de crédito podiam poluir a listagem geral de **Lançamentos** bancários (`/transactions`) ou gerar dupla contagem visual nos dashboards caso a fatura consolidada também fosse debitada na conta-corrente. Além disso, a gestão de cartões ficava restrita a um modal simples dentro de Configurações, dificultando o acompanhamento de limites disponíveis, melhor dia de compra, fechamento e detalhamento de compras agrupadas por fatura.

## Decisão
1. **Isolamento de Lançamentos**:
   - O endpoint `GET /api/v1/transactions` filtra por padrão `or_(Transaction.credit_card_id.is_(None), Transaction.is_invoice_payment == 1)`. As compras individuais no cartão de crédito pertencem ao ciclo de faturas e não poluem o extrato bancário padrão, mantendo apenas a despesa consolidada de quitação da fatura na conta bancária.
   - Parâmetro `include_card_expenses: bool = Query(False)` e `credit_card_id` permitem buscas específicas de compras no cartão quando necessário.

2. **Deduplicação de Métricas no Dashboard**:
   - Todas as agregações de despesas realizadas/pendentes e orçamentos no Dashboard (`/api/v1/dashboard`) adicionaram a condição `Transaction.is_invoice_payment == 0` para evitar dupla contagem entre as compras individuais do cartão e o pagamento consolidado da fatura bancária, enquanto `out_query` mantém a saída real da conta.

3. **Tela Dedicada "Cartões & Faturas" (`CreditCards.tsx`)**:
   - Nova aba no menu principal do sistema com:
     - Faixa de KPIs globais: Limite Total Disponível, Limite Comprometido, Faturas Abertas e Contagem de Cartões.
     - Carrossel/Grid de cartões virtuais dinâmicos com degradês personalizados, limites, melhor dia de compra e barra de progresso de comprometimento.
     - Navegador mês a mês com status da fatura (`ABERTA`, `FECHADA`, `PAGA`).
     - Ações de fatura: Liquidação/Pagamento com débito em conta, Reabertura/Estorno em 1 clique, Adição de compra direta na fatura, e Exportação CSV.
     - Tabela de compras da fatura com busca, filtro de categorias, visualizador de anexos e edição/exclusão direta.
     - Widget de distribuição percentual de gastos por categoria na fatura.

4. **Detalhamento de Faturas Enriquecido no Backend**:
   - O endpoint `GET /api/v1/credit-cards/{id}/invoices/{year}/{month}` agora carrega anexos (`attachments`) em cada compra da fatura e calcula o `category_breakdown` ordenado por valor decrescente.

## Consequências
- Extrato bancário de Lançamentos permanece limpo e focado no fluxo de caixa real das contas.
- Compras no cartão ficam organizadas por fatura e cartão com acompanhamento de limites em tempo real.
- Suporte total a comprovantes e anexos nas compras do cartão.
- Integridade financeira e conciliação perfeita entre contas bancárias e faturas de cartão.
