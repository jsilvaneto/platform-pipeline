# ADR 007: Transferências Entre Contas Próprias (Movimentação Patrimonial)

## Status
Aceito

## Contexto
O usuário necessitava movimentar saldo entre contas próprias (ex: da Conta Corrente para a Poupança ou Investimentos) sem inflar os relatórios de receitas e despesas operacionais. Transferências entre contas próprias constituem fatos contábeis permutativos (patrimoniais), e não fatos modificativos (receitas/despesas operacionais).

## Decisão
1. **Modelagem e Banco de Dados**:
   - `Transaction.type`: Atualizado para aceitar `TRANSFERENCIA` via restrição `CheckConstraint("type IN ('RECEITA', 'DESPESA', 'TRANSFERENCIA')", name="chk_trans_type")`.
   - Adicionado `Transaction.destination_account_id` com chave estrangeira para `accounts.id` (`ON DELETE SET NULL`).
   - `Transaction.category_id`: Tornado opcional no schema/banco ou associado automaticamente à categoria de sistema *"Transferência Interna"*.
   - Criada migração SQLite dinâmica em `backend/app/main.py` para recriação da tabela e garantia das restrições de verificação sem perda de dados históricos.
2. **Isolamento em Relatórios e Dashboards**:
   - Os endpoints de agregação e KPIs do Dashboard (`/api/v1/dashboard/*`) filtram estritamente `Transaction.type == 'RECEITA'` e `Transaction.type == 'DESPESA'`, garantindo que movimentações internas entre contas não inflem faturamento nem despesas operacionais.
   - A listagem de lançamentos por conta (`account_id`) filtra registros onde a conta selecionada seja a origem (`account_id`) ou o destino (`destination_account_id`).
3. **Interface e Experiência do Usuário (Frontend)**:
   - **TransactionModal.tsx**: Seletor de tipo com 3 opções (`Despesa`, `Receita`, `Transferência`). Ao selecionar Transferência, apresenta seção dedicada com seleção de **Conta de Origem (Saída / Débito)** e **Conta de Destino (Entrada / Crédito)** com validação de contas distintas, auto-sugestão de descrição (`"Transferência: [Origem] → [Destino]"`) e ocultação de campos irrelevantes.
   - **Transactions.tsx**: Filtro superior com aba `Transferências`, badge `⇄ Transferência Interna`, exibição da rota `[Origem] → [Destino]` na coluna de contas e formatação de valor neutra em tom índigo (`⇄ R$ valor`).

## Consequências
- **Positivas**:
  - Total controle do fluxo de caixa e realocação de capital entre contas correntes, caixas físicos e investimentos.
  - Dashboards, DRE e indicadores de receitas/despesas 100% fidedignos e livres de inflação artificial.
  - Filtro por conta exibe o extrato completo e fidedigno de cada instituição financeira.
- **Negativas**:
  - Nenhuma identificada.
