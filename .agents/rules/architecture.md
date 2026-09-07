# Fronteiras Arquiteturais e Responsabilidades (architecture.md)

1. **Separação Rígida de Camadas**:
   - `core/`: Configurações e segurança. Sem regras de negócio.
   - `models/`: Mapeamento ORM puro. Sem queries diretas ou lógica HTTP.
   - `schemas/`: Contratos de serialização e validação. Sem dependência do ORM.
   - `services/`: Regras de negócio desacopladas de frameworks web.
   - `api/`: Validação de tokens, injeção de dependências e roteamento HTTP.
2. **Proibição de Lógica Mista**:
   - Nunca escreva queries no arquivo de rotas (`api/`). Delegue sempre para o `services/`.
   - Nunca faça chamadas diretas de fetch no meio de componentes React. Utilize o cliente centralizado `api/client.ts`.
