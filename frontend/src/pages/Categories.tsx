import React, { useState, useEffect, useCallback } from "react";
import {
  Tag,
  CreditCard,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { walletApi } from "../api/walletApi";
import { Modal } from "../components/Modal";
import {
  Category,
  PaymentMethod,
  PaymentMethodType,
  CategoryCreateInput,
  PaymentMethodCreateInput,
} from "../types";

const COLOR_PRESETS = [
  "#ef4444", // Vermelho
  "#f97316", // Laranja
  "#f59e0b", // Âmbar
  "#10b981", // Esmeralda
  "#06b6d4", // Ciano
  "#3b82f6", // Azul
  "#6366f1", // Índigo
  "#8b5cf6", // Violeta
  "#ec4899", // Rosa
  "#6b7280", // Cinza
];

const PAYMENT_TYPE_LABELS: Record<PaymentMethodType, string> = {
  CARTAO_CREDITO: "Cartão de Crédito",
  CARTAO_DEBITO: "Cartão de Débito",
  PIX: "Pix",
  DINHEIRO: "Dinheiro em Espécie",
  BOLETO: "Boleto Bancário",
  OUTRO: "Outro Meio",
};

export const Categories: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"categories" | "payment_methods">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Modal Category
  const [isCatModalOpen, setIsCatModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>("");
  const [newCatColor, setNewCatColor] = useState<string>("#6366f1");

  // Modal Payment Method
  const [isPmModalOpen, setIsPmModalOpen] = useState<boolean>(false);
  const [newPmName, setNewPmName] = useState<string>("");
  const [newPmType, setNewPmType] = useState<PaymentMethodType>("CARTAO_CREDITO");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cats, pms] = await Promise.all([
        walletApi.getCategories(),
        walletApi.getPaymentMethods(),
      ]);
      setCategories(cats);
      setPaymentMethods(pms);
    } catch {
      setFeedbackMsg("Erro ao carregar configurações de categorias e meios de pagamento.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSubmitting(true);
    try {
      const payload: CategoryCreateInput = {
        name: newCatName.trim(),
        color: newCatColor,
        icon: "Tag",
      };
      await walletApi.createCategory(payload);
      setIsCatModalOpen(false);
      setNewCatName("");
      loadData();
    } catch {
      alert("Erro ao criar categoria.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Deseja excluir a categoria "${name}"?`)) return;
    try {
      await walletApi.deleteCategory(id);
      loadData();
    } catch {
      alert("Erro ao excluir categoria.");
    }
  };

  const handleCreatePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPmName.trim()) return;
    setIsSubmitting(true);
    try {
      const payload: PaymentMethodCreateInput = {
        name: newPmName.trim(),
        type: newPmType,
      };
      await walletApi.createPaymentMethod(payload);
      setIsPmModalOpen(false);
      setNewPmName("");
      loadData();
    } catch {
      alert("Erro ao criar forma de pagamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePaymentMethod = async (id: string, name: string) => {
    if (!window.confirm(`Deseja excluir a forma de pagamento "${name}"?`)) return;
    try {
      await walletApi.deletePaymentMethod(id);
      loadData();
    } catch {
      alert("Erro ao excluir forma de pagamento.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Categorias & Formas de Pagamento
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Personalize suas categorias de despesas e os meios de liquidação utilizados
          </p>
        </div>

        {activeTab === "categories" ? (
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Categoria</span>
          </button>
        ) : (
          <button
            onClick={() => setIsPmModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Forma de Pagamento</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "categories"
              ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Categorias ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("payment_methods")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "payment_methods"
              ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Formas de Pagamento ({paymentMethods.length})</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : activeTab === "categories" ? (
        /* Grid de Categorias */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  <Tag className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {cat.name}
                </span>
              </div>

              <button
                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Excluir categoria"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Grid de Formas de Pagamento */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                    {pm.name}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    {PAYMENT_TYPE_LABELS[pm.type]}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDeletePaymentMethod(pm.id, pm.name)}
                className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Excluir forma de pagamento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Categoria */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Cadastrar Categoria de Despesa"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nome da Categoria *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Assinaturas, Mercado, Combustível"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Cor de Identificação
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCatColor(color)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    newCatColor === color ? "scale-125 ring-2 ring-indigo-500 ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsCatModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Salvar Categoria
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Nova Forma de Pagamento */}
      <Modal
        isOpen={isPmModalOpen}
        onClose={() => setIsPmModalOpen(false)}
        title="Cadastrar Forma de Pagamento"
        maxWidth="sm"
      >
        <form onSubmit={handleCreatePaymentMethod} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nome de Identificação *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Cartão Nubank Ultravioleta, Cartão Inter, Dinheiro"
              value={newPmName}
              onChange={(e) => setNewPmName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Tipo do Meio *
            </label>
            <select
              value={newPmType}
              onChange={(e) => setNewPmType(e.target.value as PaymentMethodType)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="PIX">Pix</option>
              <option value="DINHEIRO">Dinheiro em Espécie</option>
              <option value="BOLETO">Boleto Bancário</option>
              <option value="OUTRO">Outro Meio</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsPmModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Salvar Meio
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
