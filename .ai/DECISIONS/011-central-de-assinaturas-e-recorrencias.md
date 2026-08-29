# ADR 011: Central de Assinaturas, Contratos e Pagamentos Recorrentes

## Status
Aceito

## Contexto
O Wallet gerava lançamentos recorrentes e compras parceladas no ato da criação de transações através do serviço `schedule_service.py`, mas não existia uma central unificada de gerenciamento de contratos (`Schedule`). Usuários não podiam visualizar a totalidade de suas assinaturas fixas (*Streaming*, *Aluguel*, *Internet*, *Salários*, *Contratos PJ*), reajustar valores futuros de parcelas pendentes sem alterar o histórico já pago, pausar temporariamente contratos ou cancelar assinaturas de forma limpa.

## Decisão
1. **Backend & Endpoints (`/api/v1/schedules`)**:
   - `GET /api/v1/schedules`: Listagem enriquecida com relacionamentos carregados via `selectinload` (`category`, `account`, `credit_card`, `payment_method`, `contact`), contagem de parcelas quitadas vs. pendentes (`paid_count`, `pending_count`), valores totais pagos e pendentes, e cálculo da data do próximo vencimento (`next_due_date`).
   - `POST /api/v1/schedules/{schedule_id}/adjust`:
     - Permite alterar o valor recorrente (`new_amount_cents`), dia de vencimento (`new_due_day`) e descrição (`new_description`).
     - Atualiza em cascata **todos os lançamentos futuros pendentes** vinculados, preservando integralmente o histórico de transações já liquidadas.
   - `POST /api/v1/schedules/{schedule_id}/action`:
     - `PAUSAR`: Altera o status do contrato para `PAUSADO`.
     - `REATIVAR`: Restaura o status para `ATIVO`.
     - `CANCELAR`: Altera o status para `CANCELADO` e exclui todos os lançamentos futuros pendentes associados sem afetar transações concluídas no passado.
   - `DELETE /api/v1/schedules/{schedule_id}`: Exclusão com limpeza de pendências.
2. **Frontend ([Settings.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/pages/Settings.tsx))**:
   - Aba **Configurações > Assinaturas & Recorrências** (grupo *Cadastros Financeiros*).
   - Painel com KPIs instantâneos: *Contratos Ativos*, *Custo Mensal Recorrente Consolidado*, *Receita Recorrente Fixa*.
   - Filtros dinâmicos por texto, tipo (*Assinaturas Contínuas* vs. *Parcelamentos*) e situação (*Ativo*, *Pausado*, *Cancelado*).
   - Cards com visualização de periodicidade, dia de vencimento, próximo vencimento, barra de progresso de parcelas e ações em 1 clique (**Reajustar**, **Pausar/Retomar**, **Cancelar**, **Excluir**).
   - Modal executivo de Reajuste Futuro.

## Consequências
- **Positivas**:
  - Clareza e previsibilidade sobre compromissos fixos e contratos contínuos.
  - Reajustes de preço de planos futuros sem corrupção ou edição manual exaustiva de lançamentos individuais.
  - Histórico financeiro passado 100% blindado contra alterações retroativas indevidas.
- **Negativas**:
  - Nenhuma identificada.
