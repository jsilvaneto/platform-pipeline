# ADR 004: Desacoplamento entre Contas Bancárias e Formas de Pagamento

## Status
**Aceito**

## Contexto
Na modelagem financeira tradicional de pequenos sistemas, é comum misturar a instituição financeira com o meio de pagamento (ex: cadastrar "Cartão Nubank", "Pix Itaú", "Dinheiro"). No entanto, no mundo real e na gestão contábil avançada, a conta bancária/custódia do recurso e a forma/instrumento de pagamento são dimensões ortogonais:
- Uma mesma conta corrente (ex: *Itaú PJ*) pode ser movimentada via *Pix*, *Boleto*, *Cartão de Débito*, *Transferência TED* ou *Débito Automático*.
- Uma despesa em *Dinheiro Físico* pode sair da *Carteira* ou do *Caixa da Empresa*.
- Um lançamento pode ter apenas a forma de pagamento definida sem que a conta específica tenha sido selecionada imediatamente.

## Decisão
1. **Entidade `PaymentMethod` Dedicada**: Criar o modelo `PaymentMethod` associado ao perfil (`PESSOAL` ou `EMPRESA`) e ao nome do instrumento de pagamento.
2. **Desacoplamento em Lançamentos**: Adicionar `payment_method_id` opcional como chave estrangeira (`ON DELETE SET NULL`) em `Transaction` e `Schedule`, mantendo `account_id` independente.
3. **Gestão Centralizada em Configurações**: Disponibilizar uma aba dedicada de gerenciamento de Formas de Pagamento em Configurações, com seeds automáticos no primeiro startup (*Pix, Boleto, Cartão de Crédito, Cartão de Débito, Dinheiro Físico, Transferência Bancária, Débito Automático*).
4. **Filtros e Busca Textual Multidimensional**: Permitir filtrar transações por Forma de Pagamento isoladamente ou combinada com Contas, Categorias e Status, além de indexar o nome da forma de pagamento na busca textual global da tela de lançamentos.

## Consequências

### Positivas
- **Clareza Contábil**: Relatórios e filtros permitem responder perguntas como *"Quanto gastei em Pix este mês?"* ou *"Quantos boletos tenho a vencer na conta Itaú?"*.
- **Flexibilidade no Lançamento**: O usuário pode preencher ambos os campos, apenas um ou nenhum de forma não bloqueante.
- **Resiliência na Exclusão**: A exclusão de uma forma de pagamento não afeta o lançamento financeiro, aplicando `SET NULL` automaticamente.
