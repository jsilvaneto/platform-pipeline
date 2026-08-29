# ADR 012: Importador e Conciliação Bancária OFX / CSV Exclusivo para Perfil EMPRESA

## Status
Aceito

## Contexto
A gestão de contas a pagar e receber de empresas (perfil `EMPRESA`) exige rotinas diárias ou semanais de conferência bancária para garantir que todos os débitos, créditos, tarifas e recebimentos Pix coincidam com o extrato da conta corrente PJ. O cadastro manual individual de cada transação de extrato consome tempo e é passível de esquecimento ou duplicação.
Conforme diretriz explícita de negócio, **a conciliação bancária é um recurso exclusivo do perfil `EMPRESA` e não se aplica ao perfil `PESSOAL`**.

## Decisão
1. **Parser Robusto em Python ([conciliation_service.py](file:///home/jsilvaneto/projetos/wallet/backend/app/services/conciliation_service.py))**:
   - Suporte nativo a extratos bancários `.ofx` (SGML e XML) e `.csv` de qualquer banco brasileiro (Itaú, Inter, Bradesco, Santander, Banco do Brasil, Nubank PJ, Caixa, etc.).
   - Conversão de datas e formatação de valores para centavos inteiros com inferência de tipo (`RECEITA` vs `DESPESA`).
2. **Endpoints de Conciliação ([conciliation.py](file:///home/jsilvaneto/projetos/wallet/backend/app/api/v1/conciliation.py))**:
   - Validação estrita: se `profile != "EMPRESA"`, rejeita a requisição com código `HTTP 400 Bad Request`.
   - `POST /api/v1/conciliation/parse`:
     - Processa o extrato enviado e cruza contra os lançamentos já cadastrados no banco de dados na respectiva conta.
     - Classifica cada item como `NOVO` ou `DUPLICADO`.
     - Analisa palavras-chave da descrição contra o histórico recente para sugerir automaticamente a `category_id`, `contact_id` e `payment_method_id`.
   - `POST /api/v1/conciliation/import`:
     - Ingestão em lote de todas as transações aprovadas e selecionadas pelo usuário, atribuindo conta bancária e marcando como `CONCLUIDO`.
3. **Interface do Usuário ([ConciliationModal.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/components/ConciliationModal.tsx) e [Transactions.tsx](file:///home/jsilvaneto/projetos/wallet/frontend/src/pages/Transactions.tsx))**:
   - Botão **Conciliação OFX/CSV** renderizado condicionalmente apenas quando o perfil ativo for `EMPRESA`.
   - Fluxo em duas etapas:
     1. Seleção de conta bancária PJ e upload do arquivo.
     2. Painel de conferência com KPIs (total, novos, duplicados), tabela com seleção por checkbox, edição direta de descrições e ajustes de categoria/favorecido antes da importação.

## Consequências
- **Positivas**:
  - Agilidade massiva no fechamento contábil e financeiro empresarial.
  - Prevenção ativa de lançamentos duplicados na conta bancária.
  - Alinhamento 100% fiel à regra de isolamento de perfis e semântica de centavos inteiros.
- **Negativas**:
  - Nenhuma identificada.
