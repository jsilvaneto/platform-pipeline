import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "../Modal";
import { Contact } from "../../types";
import { walletApi } from "../../api/walletApi";

interface QuickContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactCreated: (newContact: Contact) => void;
}

export const QuickContactModal: React.FC<QuickContactModalProps> = ({
  isOpen,
  onClose,
  onContactCreated,
}) => {
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setPhone("");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome do contato é obrigatório.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const newContact = await walletApi.createContact({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      onContactCreated(newContact);
      onClose();
    } catch {
      setError("Erro ao criar contato.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Contato Rápido" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Nome do Contato *
          </label>
          <input
            type="text"
            required
            placeholder="Ex: Farmácia São Bento, Dr. Roberto, Cemig"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
            Telefone (Opcional)
          </label>
          <input
            type="text"
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
            <span>Criar Contato</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
