---
name: contract-sync
description: >-
  Use this skill when modifying backend schemas or frontend types to synchronize
  OpenAPI specifications and TypeScript interfaces without contract drift.
---

# Skill: Contract Sync (OpenAPI ➜ TypeScript)

Esta skill define o protocolo para sincronizar contratos de dados entre os Schemas Pydantic v2 (Backend) e as Interfaces TypeScript (Frontend).

## 1. Tabela de Conversão de Tipos (Pydantic v2 ➜ TypeScript)

| Tipo Pydantic v2 (Python) | Tipo TypeScript (Frontend) | Observações |
| :--- | :--- | :--- |
| `str` | `string` | Textos e identificadores |
| `int` | `number` | Inclui valores monetários em centavos |
| `float` | `number` | Proibido para valores monetários |
| `bool` | `boolean` | `true` ou `false` |
| `list[T]` / `Sequence[T]` | `T[]` | Coleções de dados |
| `dict[str, Any]` | `Record<string, unknown>` | Evite `any` |
| `T \| None = None` | `T \| null` ou `campo?: T` | Tratar nulidade explicitamente |
| `Literal["A", "B"]` | `"A" \| "B"` | Enums e literais fechados |
| `datetime` | `string` | Formato ISO 8601 UTC |

## 2. Checklist de Sincronização Obrigatório

Sempre que alterar um endpoint ou schema no backend:

1. **Localize o Schema no Backend**:
   - `backend/app/schemas/<modulo>.py`.
2. **Atualize ou Crie a Interface no Frontend**:
   - Abra `frontend/src/types/index.ts`.
   - Adicione os tipos correspondentes: `<Entidade>`, `<Entidade>CreateInput`, `<Entidade>UpdateInput` e `<Entidade>FilterParams`.
3. **Verifique Compatibilidade de Nulidade**:
   - Campos `nullable=True` no banco ou `Optional[...]` no schema Pydantic devem conter `| null` ou `?:` no TypeScript.
4. **Validação Automática**:
   Execute a compilação do TypeScript para garantir que nenhuma propriedade quebrada permaneceu no frontend:
   ```bash
   cd frontend && npm run build
   ```

## 3. Extração da Especificação OpenAPI
Para inspecionar o schema JSON gerado pelo FastAPI:
```bash
python3 -c "import json; from app.main import app; print(json.dumps(app.openapi(), indent=2))" > openapi_schema.json
```
