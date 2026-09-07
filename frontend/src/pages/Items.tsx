import React, { useEffect, useState, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, Layers, AlertCircle, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { api } from "../api/client";
import { Item, ItemStatus, ItemCreateInput, ItemUpdateInput } from "../types";
import { Modal } from "../components/Modal";
import { formatDate } from "../utils/format";

interface ItemsPageProps {
  isCreateModalOpenExternal?: boolean;
  onCloseCreateModalExternal?: () => void;
}

export const Items: React.FC<ItemsPageProps> = ({
  isCreateModalOpenExternal,
  onCloseCreateModalExternal,
}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | "ALL">("ALL");

  // Modais de Criação e Edição
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formStatus, setFormStatus] = useState<ItemStatus>("PENDENTE");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sincroniza abertura externa vinda do Dashboard
  useEffect(() => {
    if (isCreateModalOpenExternal) {
      setIsCreateOpen(true);
    }
  }, [isCreateModalOpenExternal]);

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    if (onCloseCreateModalExternal) {
      onCloseCreateModalExternal();
    }
    setFormTitle("");
    setFormDescription("");
    setFormStatus("PENDENTE");
  };

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params: Record<string, string | number> = {};
      if (selectedStatus !== "ALL") params.status = selectedStatus;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get<Item[]>("/items", { params });
      setItems(res.data);
    } catch (err: unknown) {
      console.error("Erro ao carregar itens:", err);
      setErrorMsg("Não foi possível carregar a lista de itens da API.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, searchTerm]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: ItemCreateInput = {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        status: formStatus,
      };
      await api.post<Item>("/items", payload);
      handleCloseCreate();
      await loadItems();
    } catch (err) {
      console.error("Erro ao cadastrar item:", err);
      setErrorMsg("Erro ao cadastrar novo item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: ItemUpdateInput = {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        status: formStatus,
      };
      await api.put<Item>(`/items/${editingItem.id}`, payload);
      setEditingItem(null);
      await loadItems();
    } catch (err) {
      console.error("Erro ao atualizar item:", err);
      setErrorMsg("Erro ao atualizar o item selecionado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/items/${id}`);
      setDeletingItemId(null);
      await loadItems();
    } catch (err) {
      console.error("Erro ao excluir item:", err);
      setErrorMsg("Não foi possível excluir o item.");
    }
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDescription(item.description || "");
    setFormStatus(item.status);
  };

  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case "PENDENTE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </span>
        );
      case "EM_ANDAMENTO":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <PlayCircle className="w-3 h-3 mr-1" />
            Em Andamento
          </span>
        );
      case "CONCLUIDO":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Concluído
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Gestor de Itens (Scaffold)
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Exemplo funcional de CRUD com persistência assíncrona em PostgreSQL.
          </p>
        </div>
        <button
          onClick={() => {
            setFormTitle("");
            setFormDescription("");
            setFormStatus("PENDENTE");
            setIsCreateOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center space-x-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Item</span>
        </button>
      </div>

      {/* Alerta de Erro */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center space-x-3 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Pílulas de Status */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ALL", "PENDENTE", "EM_ANDAMENTO", "CONCLUIDO"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedStatus === st
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {st === "ALL"
                ? "Todos"
                : st === "PENDENTE"
                ? "Pendentes"
                : st === "EM_ANDAMENTO"
                ? "Em Andamento"
                : "Concluídos"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Itens */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-zinc-400 text-sm">
            Carregando itens...
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Layers className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Nenhum item encontrado
            </h4>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Cadastre um novo item ou ajuste os filtros de busca.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Título & Descrição</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Criado em</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-lg">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                    <td className="py-3.5 px-4 hidden sm:table-cell text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Editar item"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingItemId(item.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Excluir item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação */}
      <Modal
        isOpen={isCreateOpen}
        onClose={handleCloseCreate}
        title="Cadastrar Novo Item"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Título *
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="ex: Configurar pipeline de CI/CD"
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Descrição (Opcional)
            </label>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Detalhes adicionais sobre este item..."
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Status Inicial
            </label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as ItemStatus)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PENDENTE">Pendente</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDO">Concluído</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleCloseCreate}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formTitle.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors shadow-md shadow-indigo-600/20"
            >
              {isSubmitting ? "Salvando..." : "Criar Item"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Editar Item"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Título *
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Descrição
            </label>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Status
            </label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as ItemStatus)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PENDENTE">Pendente</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDO">Concluído</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formTitle.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors shadow-md shadow-indigo-600/20"
            >
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={!!deletingItemId}
        onClose={() => setDeletingItemId(null)}
        title="Confirmar Exclusão"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tem certeza de que deseja excluir permanentemente este item? Esta ação não pode ser desfeita.
          </p>
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setDeletingItemId(null)}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => deletingItemId && handleDelete(deletingItemId)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors shadow-md shadow-rose-600/20"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
