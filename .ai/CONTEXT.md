# Contexto de Negócio e Domínio (.ai/CONTEXT.md)

Este documento registra os princípios fundamentais, regras de domínio e invariantes do projeto construído a partir deste boilerplate.

---

## 1. Visão Geral do Produto
O **Wallet** é uma aplicação focada exclusivamente em **finanças pessoais**. Seu objetivo é fornecer controle financeiro completo para indivíduos e famílias (gestão de contas bancárias e carteiras, transações de receitas e despesas pessoais, categorização, orçamentos domésticos e metas de economia), com máxima simplicidade, transparência e segurança.

O sistema **não suporta nem suportará recursos empresariais (PJ)**, tais como centros de custo corporativos, fluxo de caixa empresarial, conciliação contábil de pessoas jurídicas ou múltiplos perfis de acesso corporativo.

---

## 2. Invariantes de Domínio
1. **Foco Estritamente Pessoal**: Todos os registros financeiros pertencem direta e exclusivamente ao usuário autenticado (`user_id`). Não há segregação de perfis (`PESSOAL` vs `EMPRESA`).
2. **Valores Monetários Exatos**: Valores são armazenados e processados exclusivamente em centavos como inteiros (`amount_cents: int`), prevenindo erros de arredondamento de ponto flutuante.
3. **Segurança e Isolamento**: Todas as rotas de dados financeiros exigem autenticação Bearer JWT e são obrigatoriamente filtradas pelo `user_id` do usuário da sessão.
4. **Consistência de Dados**: O banco de dados opera em PostgreSQL 16 gerenciado por pool assíncrono (`asyncpg`), garantindo integridade transacional ACID estrita.
5. **Contratos Estritos**: Todas as trocas de mensagens entre cliente e servidor são estritamente validadas por schemas Pydantic v2 e interfaces TypeScript sem uso de `any`.

---

## 3. Entidades Principais
- **Usuário (`User`)**: Representa o titular da conta pessoal no sistema.
- **Entidades de Finanças Pessoais**: Contas, categorias, transações pessoais, orçamentos e metas vinculadas diretamente ao `user_id`.
