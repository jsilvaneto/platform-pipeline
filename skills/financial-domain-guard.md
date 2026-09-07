# Skill: Financial Domain Guard (Regras Financeiras & Valores em Centavos)

Esta skill protege o domínio de finanças pessoais da aplicação contra erros de arredondamento e tipagens impróprias.

## 1. Regra Fundamental: Valores Monetários em Centavos
- **Backend (Python)**: Use sempre inteiros (`amount_cents: int`).
  - Nunca utilize `float` ou `Decimal` no armazenamento do banco ou em schemas de entrada e saída.
  - Exemplo: `R$ 150,50` é representado como `15050`.
- **Frontend (TypeScript)**: Represente como `amount_cents: number`.
- **Cálculos e Divisões**:
  - Em juros, descontos percentuais ou rateios, faça o cálculo matemático e arredonde o resultado para o inteiro mais próximo:
    ```python
    amount_cents = round(base_cents * (1 + rate))
    ```

## 2. Escopo Exclusivo de Finanças Pessoais
O sistema é estritamente voltado para a gestão de finanças pessoais:
- **Vínculo Direto com Usuário**: Todas as entidades financeiras (contas, transações, categorias, orçamentos, metas) pertencem diretamente ao usuário autenticado:
  ```python
  user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
  ```
- **Sem Perfis Corporativos**: Não há perfil de empresa, PJ ou segregação corporativa. Todas as contas e movimentações são de âmbito estritamente pessoal.
- **Filtro Mandatório por Usuário**: Todas as queries de listagem, soma de saldo ou relatórios DEVEM conter `.where(Model.user_id == current_user.id)`.

## 3. Constantes e Enums em UPPERCASE
- **Natureza da Operação**: `"RECEITA"`, `"DESPESA"`, `"TRANSFERENCIA"`.
- **Status do Pagamento**: `"PENDENTE"`, `"CONCLUIDO"`, `"CANCELADO"`.
- **Grau de Essencialidade**: `"OBRIGATORIO"`, `"NECESSARIO"`, `"DESEJO"`, `"NENHUM"`.

## 4. Formatação de Moeda no Frontend
Utilize sempre a função centralizada de formatação (`frontend/src/utils/format.ts`):
```typescript
export const formatCurrency = (amountCents: number): string => {
  return (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};
```
Nunca realize formatação manual com `+ " R$"` ou concatenação de strings.
