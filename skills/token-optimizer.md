# Skill: Token Optimizer

## Diretrizes de Resposta e Consumo de Contexto
Para otimizar o uso da janela de contexto e economizar tokens, siga este protocolo:

1. **Edição Cirúrgica (Diffs em vez de arquivos inteiros):**
   - Nunca reescreva um arquivo inteiro para alterar poucas linhas.
   - Forneça apenas os blocos relevantes alterados com contexto mínimo suficiente para localizar a inserção (ou utilize formato `diff`).

2. **Exclusão de Ruído de Contexto:**
   - Não analise nem processe logs, saídas de build, `node_modules`, lockfiles (`package-lock.json`, `poetry.lock`) ou assets estáticos (imagens, svgs).
   - Se precisar ler dependências instaladas, consulte apenas o manifesto principal (`package.json`, `requirements.txt`, etc.).

3. **Comunicação Concisa:**
   - Elimine explicações teóricas repetitivas ou cumprimentos formais.
   - Apresente o código, a justificativa em 1 ou 2 tópicos objetivos e o caminho do arquivo alterado.
