# Manual de Desenvolvimento do Frontend para Agentes de IA (.ai/FRONTEND_GUIDE.md)

Este documento estabelece o guia prático, padrões de interface e o passo a passo exato para qualquer **Agente de IA** que precise criar telas, componentes ou integrar novas rotas no **Frontend** (React 19 + TypeScript + Tailwind CSS).

---

## 1. Princípios Inegociáveis

1. **TypeScript Estrito**: É terminantemente proibido o uso de `any`. Todas as props, respostas de API, estados de componentes e parâmetros de eventos devem ter tipagem explícita.
2. **Suporte Mandatório a Dark e Light Mode**:
   - Todo elemento visual DEVE especificar estilos tanto para o modo claro quanto para o modo escuro utilizando o prefixo `dark:`.
   - Cores de fundo padrão:
     - Fundo de página: `bg-zinc-50 dark:bg-zinc-950`
     - Superfícies/Cards: `bg-white dark:bg-zinc-900`
     - Bordas: `border-zinc-200 dark:border-zinc-800`
     - Textos primários: `text-zinc-900 dark:text-zinc-100`
     - Textos secundários: `text-zinc-500 dark:text-zinc-400`
3. **Consumo HTTP Centralizado**: Nunca instancie `fetch` ou um novo cliente Axios avulso. Utilize sempre a instância pré-configurada em `frontend/src/api/client.ts`.
4. **Tratamento de Estados**: Sempre implemente feedback visual para:
   - Estado de carregamento (*Loading spinners* ou *skeletons*).
   - Estado de lista vazia (*Empty state* com mensagem clara e CTA).
   - Estado de erro (*Alert banners* com detalhes amigáveis).

---

## 2. Passo a Passo: Como Criar uma Nova Tela/Recurso

Ao adicionar uma nova funcionalidade no frontend (exemplo: `Categories`), siga esta sequência:

### Passo 1: Definir Contratos de Tipagem
Abra `frontend/src/types/index.ts` e declare as interfaces correspondentes:
```typescript
export interface Category {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreateInput {
  name: string;
  description?: string;
  is_active?: boolean;
}
```

---

### Passo 2: Criar a Página com Estados Completos
Crie o arquivo em `frontend/src/pages/Categories.tsx`:
```tsx
import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, FolderPlus, Loader2, AlertCircle } from "lucide-react";
import api from "../api/client";
import { Category, CategoryCreateInput } from "../types";
import { Modal } from "../components/Modal";

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Category[]>("/categories");
      setCategories(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erro ao carregar categorias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      await api.post("/categories", { name: name.trim() } as CategoryCreateInput);
      setName("");
      setIsModalOpen(false);
      await fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erro ao criar categoria.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta categoria?")) return;
    try {
      await api.delete(`/categories/${id}`);
      await fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erro ao excluir categoria.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Categorias
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gestão de categorias do sistema com persistência em PostgreSQL.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <FolderPlus className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Nenhuma categoria encontrada
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Cadastre a primeira categoria para começar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between shadow-sm"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{cat.name}</span>
              <button
                onClick={() => handleDelete(cat.id)}
                className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Categoria">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Nome da Categoria
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Infraestrutura"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {submitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
```

---

### Passo 3: Registrar Navegação no App
Em `frontend/src/App.tsx` e `frontend/src/components/Header.tsx`, inclua a nova aba/rota no switcher de abas da aplicação.

---

## 3. Validação do Frontend

Para garantir que não há erros de compilação ou violações de tipagem TypeScript:
```bash
cd frontend && npm run build
```
Para executar a verificação estática de boas práticas com Oxlint:
```bash
cd frontend && npm run lint
```
