import React from "react";
import { Filter } from "lucide-react";
import { Category, Item, Contact, EssentialityType, ExpenseStatus } from "../../types";

interface ExpenseFiltersProps {
  statusFilter: ExpenseStatus | "ALL" | "OVERDUE";
  setStatusFilter: (val: ExpenseStatus | "ALL" | "OVERDUE") => void;
  categoryFilter: string;
  setCategoryFilter: (val: string) => void;
  itemFilter: string;
  setItemFilter: (val: string) => void;
  contactFilter: string;
  setContactFilter: (val: string) => void;
  essentialityFilter: EssentialityType | "ALL";
  setEssentialityFilter: (val: EssentialityType | "ALL") => void;
  categories: Category[];
  items: Item[];
  contacts: Contact[];
  totalCount: number;
}

export const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  itemFilter,
  setItemFilter,
  contactFilter,
  setContactFilter,
  essentialityFilter,
  setEssentialityFilter,
  categories,
  items,
  contacts,
  totalCount,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
          <Filter className="w-4 h-4" />
          <span>Filtros:</span>
        </div>

        {/* Filtro Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | "ALL" | "OVERDUE")}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Status: Todos</option>
          <option value="PENDENTE">Apenas Pendentes</option>
          <option value="OVERDUE">⚠️ Apenas Atrasadas</option>
          <option value="CONCLUIDO">Apenas Concluídos</option>
        </select>

        {/* Filtro Categoria */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Categoria: Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Filtro Item */}
        <select
          value={itemFilter}
          onChange={(e) => setItemFilter(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Item: Todos</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>
              {it.name}
            </option>
          ))}
        </select>

        {/* Filtro Contato */}
        <select
          value={contactFilter}
          onChange={(e) => setContactFilter(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Contato: Todos</option>
          {contacts.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.name}
            </option>
          ))}
        </select>

        {/* Filtro Essencialidade */}
        <select
          value={essentialityFilter}
          onChange={(e) => setEssentialityFilter(e.target.value as EssentialityType | "ALL")}
          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Essencialidade: Todas</option>
          <option value="OBRIGATORIO">Obrigatório</option>
          <option value="NECESSARIO">Necessário</option>
          <option value="DESEJO">Desejo</option>
          <option value="NENHUM">Geral</option>
        </select>
      </div>

      <span className="text-xs text-zinc-400 dark:text-zinc-500">
        {totalCount} {totalCount === 1 ? "despesa encontrada" : "despesas encontradas"}
      </span>
    </div>
  );
};
