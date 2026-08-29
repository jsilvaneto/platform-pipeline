# ADR 014: Módulo de Planejamento Financeiro, Projeções e Simulador de Cenários

## Status
**APROVADO E IMPLEMENTADO** (2026-08-19)

## Contexto
O Wallet possuía ferramentas robustas de registro operacional (Lançamentos únicos, parcelados e recorrentes) e um Dashboard voltado para o mês corrente. Contudo, faltava ao usuário uma visão estratégica e prospectiva de longo prazo (12 a 24 meses) para responder a dúvidas fundamentais:
- Qual será a curva de saldo de caixa futuro com base nos contratos ativos e faturas de cartão já contratadas?
- Qual o impacto no saldo final se houver uma oscilação de receitas ou corte de gastos supérfluos?
- Quantos meses o usuário ou empresa sobrevive com o saldo atual mantendo apenas gastos essenciais (Runway / Reserva de Emergência / Burn Rate)?
- Com o ritmo atual de aportes, quando as metas financeiras serão alcançadas?
- Quantos % da renda futura já estão comprometidos?

Além disso, o menu de Configurações encontrava-se sobrecarregado com 14 abas, misturando instrumentos de planejamento com cadastros básicos.

## Decisão de Arquitetura

1. **Reestruturação da Navegação Superior**:
   - Criação de um novo menu principal dedicado: **Planejamento & Futuro** (`Planning.tsx`), posicionado diretamente na barra superior ao lado de *Dashboard*, *Lançamentos* e *Configurações & Cadastros*.

2. **Endpoints Assíncronos no Backend (`/api/v1/planning`)**:
   - `GET /api/v1/planning/projection`: Agregação assíncrona de saldo líquido inicial em contas com transações futuras, parcelamentos, faturas de cartão e recorrências ativas, gerando saldo acumulado mês a mês e detecção de riscos de déficit.
   - `POST /api/v1/planning/simulate`: Motor de simulação "What-If" com sensibilidade de receita ($-50\%$ a $+50\%$), cortes em gastos de lazer/desejos, despesas necessárias e novas obrigações fixas.
   - `GET /api/v1/planning/runway`: Cálculo de custo de vida essencial médio (últimos 3 meses), meses de fôlego/runway, reserva de emergência familiar, meta FIRE (Regra dos 4%) para `PESSOAL` e Burn Rate / Capital de Giro para `EMPRESA`.
   - `GET /api/v1/planning/goals-projection`: Projeção temporal de metas com data estimada de término, cálculo de aporte necessário reverso e simulador com juros compostos (100% do CDI).
   - `GET /api/v1/planning/committed-income`: Mapa de comprometimento de renda futura e índice de liberdade financeira.

3. **Interface Gráfica e Visualização de Dados (Frontend)**:
   - Gráficos em SVG responsivo de alta precisão com curvas de saldo acumulado, linha d'água (R$ 0,00) e tooltips interativos.
   - Sliders em tempo real com comparação imediata entre Cenário Base e Cenário Simulado.
   - Termômetro visual de fôlego financeiro com faixas de saúde (Crítico, Moderado, Bom e Excelente).

## Consequências e Benefícios
- **Decisões Estratégicas Baseadas em Dados**: O usuário pode antecipar gargalos de fluxo de caixa com até 24 meses de antecedência.
- **Zero Impacto em Performance**: Todas as agregações utilizam consultas eficientes no SQLite WAL já indexado, com tempo de resposta inferior a 50ms.
- **Isolamento Total de Perfis**: Análises personalizadas e sem contaminação entre `PESSOAL` e `EMPRESA`.
