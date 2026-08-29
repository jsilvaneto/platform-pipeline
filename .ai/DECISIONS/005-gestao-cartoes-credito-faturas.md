# ADR 005: Gestão de Cartões de Crédito, Faturas e Liquidação Consolidada

## Status
Aceito

## Contexto
O usuário necessitava de um controle rigoroso de seus cartões de crédito, com limite total, limite disponível, melhor dia de compra (fechamento) e data de vencimento. Compras realizadas com cartão de crédito não debitam a conta bancária no momento do lançamento; ao invés disso, compras avulsas e compras parceladas acumulam nas faturas dos meses correspondentes e demandam uma baixa consolidada (liquidação da fatura) com um único débito na conta bancária de origem.

## Decisão
1. **Entidade `CreditCard`**:
   - Modelada com `id`, `profile` (`PESSOAL` | `EMPRESA`), `name`, `limit_cents` (inteiro em centavos), `closing_day` (1-31), `due_day` (1-31), `color`, `brand` e `account_id` (conta de débito padrão opcional).
2. **Ciclo de Fatura e Vencimento**:
   - Compras com dia `< closing_day` caem na fatura do mês corrente (`invoice_month = mes`, `invoice_year = ano`).
   - Compras com dia `>= closing_day` caem na fatura do mês seguinte ("melhor dia de compra").
   - Compras parceladas distribuem cada parcela sucessivamente pelas faturas futuras (`invoice_month`, `invoice_year`).
3. **Limite Usado vs. Disponível**:
   - Limite usado é calculado em tempo real pela soma de todas as despesas pendentes no cartão (`status = 'PENDENTE'`).
   - `available_limit_cents = max(0, limit_cents - used_limit_cents)`.
4. **Liquidação Consolidada de Fatura (`/credit-cards/{id}/invoices/{year}/{month}/settle`)**:
   - Marca todos os lançamentos pendentes da fatura como `status = 'CONCLUIDO'`.
   - Gera um único lançamento bancário (`Transaction`) com `type = 'DESPESA'`, `account_id = conta_selecionada`, `amount_cents = total_fatura`, `is_invoice_payment = 1` e `status = 'CONCLUIDO'`.
   - Recompõe imediatamente o limite disponível do cartão.
5. **Reabertura de Fatura (`/credit-cards/{id}/invoices/{year}/{month}/unsettle`)**:
   - Remove a transação de pagamento bancário consolidada e reabre os lançamentos da fatura para o status `PENDENTE`.

## Consequências
- **Positivas**:
  - Saldo bancário permanece exato sem saídas falsas prematuras no dia da compra.
  - Projeção de fluxo de caixa futuro reflete exatamente as datas de vencimento das faturas.
  - Interface rica com cartões virtuais, barras de progresso de limite, visualizador de faturas mês a mês e liquidação com 1 clique.
- **Negativas**:
  - Exige sincronismo entre o dia de fechamento e as parcelas geradas por planos de agendamento.
