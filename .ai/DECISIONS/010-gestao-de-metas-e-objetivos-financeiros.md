# ADR 010: Gestão de Metas Financeiras, Reservas e Aportes

## Status
Aceito

## Contexto
O ecossistema Wallet possuía o modelo estrutural de Metas (`Goal`) no banco de dados SQLite, mas não dispunha de interface gráfica dedicada, nem de rotinas para registro de aportes/resgates e acompanhamento visual de progresso e estimativas de conclusão. Para viabilizar planejamento financeiro de médio e longo prazo (como formação de reserva de emergência, aquisição de bens ou metas empresariais), fez-se necessária a implementação completa da Fase 2.

## Decisão
1. **Backend & Endpoints (`/api/v1/goals`)**:
   - `POST /api/v1/goals`: Criação de metas com título, perfil (`PESSOAL` ou `EMPRESA`), valor alvo em centavos, valor inicial acumulado e data limite opcional.
   - `PUT /api/v1/goals/{goal_id}`: Edição completa dos dados e status da meta (`EM_ANDAMENTO`, `CONCLUIDA`, `CANCELADA`).
   - `POST /api/v1/goals/{goal_id}/contribute`: Registro de movimentações financeiras na meta:
     - `APORTE`: Incrementa o valor acumulado (`current_amount_cents`). Se atingir ou superar o valor alvo, altera automaticamente o status para `CONCLUIDA`.
     - `RESGATE`: Decrementa o valor acumulado. Se o saldo ficar abaixo do valor alvo, restaura o status para `EM_ANDAMENTO`.
   - `GET /api/v1/goals`: Listagem com cálculo dinâmico de `progress_percentage`.
   - `DELETE /api/v1/goals/{goal_id}`: Exclusão da meta.
2. **Frontend**:
   - **Aba Dedicada em Configurações ([Settings.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/pages/Settings.tsx))**:
     - Menu lateral "Metas Financeiras" no grupo Cadastros Financeiros.
     - Formulário moderno de cadastro com máscara monetária e data limite.
     - Grid de cards de metas com barra de progresso visual, cálculo do valor restante, status temático e filtros rápidos por texto e situação.
     - Modais para **Edição** e **Aporte / Resgate** com alternância em 1 clique.
   - **Widget no Dashboard ([Dashboard.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/pages/Dashboard.tsx))**:
     - Card de visualização executiva das metas ativas, mostrando valor acumulado vs. alvo e progresso percentual.

## Consequências
- **Positivas**:
  - Usuários podem planejar e acompanhar a evolução de reservas e objetivos patrimoniais.
  - Isolamento estrito entre perfis `PESSOAL` e `EMPRESA`.
  - Integração perfeita com o Dashboard executivo.
- **Negativas**:
  - Nenhuma identificada.
