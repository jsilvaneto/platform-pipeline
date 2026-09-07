---
trigger: always_on
---

# Padrões de Código e Convenções (coding_standards.md)

- **Tipagem Estrita**: É terminantemente proibido o uso de `any` no TypeScript ou omissão de tipos em funções Python.
- **Nomenclatura**:
  - Python: `snake_case` para variáveis, funções e métodos; `PascalCase` para classes e modelos SQLAlchemy.
  - TypeScript: `camelCase` para funções e variáveis; `PascalCase` para componentes React, types e interfaces.
- **Imports**: Agrupe imports na ordem: (1) bibliotecas padrão, (2) dependências externas, (3) módulos internos do projeto.
- **Tratamento de Exceções**: Retorne status HTTP semânticos via `HTTPException` no backend e apresente feedback claro com mensagens amigáveis no frontend.
- **Suporte a Temas**: Qualquer interface gráfica deve suportar modo claro e escuro (*Dark Mode*).
- **Resíduo Zero em Testes**: Nenhum dado fictício, registro de banco ou arquivo temporário criado para testes ou configurações pode permanecer após a execução (consulte `test_data_cleanup.md`).
