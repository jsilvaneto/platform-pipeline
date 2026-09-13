import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "../Modal";
import { Category, Item, EssentialityType } from "../../types";
import { walletApi } from "../../api/walletApi";

interface QuickItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onItemCreated: (newItem: Item) => void;
}

export const QuickItemModal: React.FC<QuickItemModalProps> = ({
  isOpen,
  onClose,
  categories,
  onItemCreated,
}) => {
  const [name, setName] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [nature, setNature] = useState<EssentialityType>("NECESSARIO");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setCategoryId(categories.length > 0 ? categories[0].id : "");
      setNature("NECESSARIO");
      setError(null);
    }
  }, [isOpen, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome do item é obrigatório.");
      return;
    }
    if (!categoryId) {
      setError("Selecione uma categoria vinculada.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const newItem = await walletApi.createItem({
        name: name.trim(),
        category_id: categoryId,
        nature,
      });
      onItemCreated(newItem);
      onClose();
    } catch {
      setError("Erro ao criar item padronizado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Item Padronizado" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Nome do Item *
          </label>
          <input
            type="text"
            required
            placeholder="Ex: Arroz, Gasolina, Netflix, Aluguel"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Categoria Vinculada *
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Natureza do Item *
          </label>
          <select
            value={nature}
            onChange={(e) => setNature(e.target.value as EssentialityType)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="OBRIGATORIO">Obrigatório</option>
            <option value="NECESSARIO">Necessário</option>
            <option value="DESEJO">Desejo</option>
            <option value="NENHUM">Nenhum / Geral</option>
          </select>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Criar Item</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
