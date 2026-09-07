---
name: security-guard
description: >-
  Use this skill to enforce DevSecOps & Code Hardening, prevent secret leaks,
  enforce input validation, and secure dependencies and infrastructure.
---

# Skill: Security Guard

## Regras de Execução Obrigatórias
Antes de sugerir, alterar ou gerar código, aplique as seguintes restrições:

1. **Gestão de Segredos e Credenciais:**
   - Proibido hardcode de senhas, chaves de API, tokens, strings de conexão ou IPs privados no código.
   - Qualquer dado sensível deve ser lido via variáveis de ambiente (`process.env`, `os.environ`, etc.).
   - Mantenha o arquivo `.env.example` atualizado apenas com nomes de variáveis e valores dummy.
   - Certifique-se de que arquivos sensíveis (`.env`, `*.pem`, `*.key`) estejam listados no `.gitignore`.

2. **Validação e Sanitização de Entrada:**
   - Trate toda entrada do usuário/cliente como não confiável.
   - Em consultas a banco de dados, utilize sempre queries parametrizadas (Prepared Statements) ou ORM seguro para mitigar SQL Injection.
   - Valide tipos, formatos e limites de payloads antes de processá-los na camada de negócio.

3. **Práticas de Infraestrutura e Dependências:**
   - Não sugira pacotes ou bibliotecas de terceiros desnecessários para tarefas simples.
   - Evite o uso de flags perigosas em scripts de build e contêineres (ex.: rodar contêiner como `root` sem necessidade).
