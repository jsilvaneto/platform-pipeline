import React, { useState, useEffect, useCallback } from "react";
import {
  Tag,
  CreditCard,
  Users,
  Plus,
  Trash2,
  Loader2,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { walletApi } from "../api/walletApi";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import {
  Category,
  PaymentMethod,
  PaymentMethodType,
  User,
  CategoryCreateInput,
  PaymentMethodCreateInput,
  UserCreateInput,
} from "../types";
import { formatDate } from "../utils/format";

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

export const Settings: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"categories" | "payment_methods" | "users">("categories");

  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal Category
  const [isCatModalOpen, setIsCatModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>("");
  const [newCatColor, setNewCatColor] = useState<string>("#6366f1");

  // Modal Payment Method
  const [isPmModalOpen, setIsPmModalOpen] = useState<boolean>(false);
  const [newPmName, setNewPmName] = useState<string>("");
  const [newPmType, setNewPmType] = useState<PaymentMethodType>("CARTAO_CREDITO");

  // Modal New User
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [newIsAdmin, setNewIsAdmin] = useState<boolean>(false);

  // Modal Reset Password
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState<string>("");

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

      // Carrega usuários se for administrador
      if (currentUser?.is_admin) {
        try {
          const userList = await walletApi.getUsers();
          setUsers(userList);
        } catch {
          console.warn("Usuário sem permissão para listar usuários do sistema.");
        }
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Erro ao carregar configurações do sistema.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // --- Handlers de Categorias ---
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
      showFeedback("success", "Categoria cadastrada com sucesso!");
      loadData();
    } catch {
      showFeedback("error", "Erro ao criar categoria.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Deseja excluir a categoria "${name}"?`)) return;
    try {
      await walletApi.deleteCategory(id);
      showFeedback("success", "Categoria excluída com sucesso.");
      loadData();
    } catch {
      showFeedback("error", "Erro ao excluir categoria.");
    }
  };

  // --- Handlers de Meios de Pagamento ---
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
      showFeedback("success", "Forma de pagamento cadastrada!");
      loadData();
    } catch {
      showFeedback("error", "Erro ao criar forma de pagamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePaymentMethod = async (id: string, name: string) => {
    if (!window.confirm(`Deseja excluir a forma de pagamento "${name}"?`)) return;
    try {
      await walletApi.deletePaymentMethod(id);
      showFeedback("success", "Forma de pagamento excluída.");
      loadData();
    } catch {
      showFeedback("error", "Erro ao excluir forma de pagamento.");
    }
  };

  // --- Handlers de Usuários ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || newPassword.length < 6) {
      showFeedback("error", "Preencha o nome de usuário e uma senha de no mínimo 6 caracteres.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: UserCreateInput = {
        username: newUsername.trim(),
        password: newPassword,
        is_admin: newIsAdmin,
      };
      await walletApi.createUser(payload);
      setIsUserModalOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewIsAdmin(false);
      showFeedback("success", "Novo usuário cadastrado com sucesso!");
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Erro ao cadastrar usuário.";
      showFeedback("error", typeof msg === "string" ? msg : "Erro ao cadastrar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (userToUpdate: User) => {
    if (userToUpdate.id === currentUser?.id) {
      showFeedback("error", "Você não pode desativar seu próprio usuário.");
      return;
    }
    try {
      await walletApi.updateUser(userToUpdate.id, {
        is_active: !userToUpdate.is_active,
      });
      showFeedback(
        "success",
        `Usuário ${userToUpdate.username} ${!userToUpdate.is_active ? "ativado" : "desativado"} com sucesso.`
      );
      loadData();
    } catch {
      showFeedback("error", "Erro ao alterar status do usuário.");
    }
  };

  const handleOpenResetPassword = (targetUser: User) => {
    setSelectedUserForPassword(targetUser);
    setResetPasswordValue("");
    setIsPasswordModalOpen(true);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || resetPasswordValue.length < 6) {
      showFeedback("error", "A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setIsSubmitting(true);
    try {
      await walletApi.updateUser(selectedUserForPassword.id, {
        password: resetPasswordValue,
      });
      setIsPasswordModalOpen(false);
      setSelectedUserForPassword(null);
      setResetPasswordValue("");
      showFeedback("success", "Senha alterada com sucesso!");
    } catch {
      showFeedback("error", "Erro ao redefinir a senha do usuário.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (userToDelete.id === currentUser?.id) {
      showFeedback("error", "Você não pode excluir o usuário que está logado.");
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${userToDelete.username}"?`)) {
      return;
    }
    try {
      await walletApi.deleteUser(userToDelete.id);
      showFeedback("success", "Usuário excluído com sucesso.");
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Erro ao excluir usuário.";
      showFeedback("error", typeof msg === "string" ? msg : "Erro ao excluir usuário.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Configurações do Sistema
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gerencie categorias de despesas, meios de pagamento e contas de acesso ao Wallet
          </p>
        </div>

        {/* Botão de Criação dinâmico com base na aba ativa */}
        {activeTab === "categories" && (
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Categoria</span>
          </button>
        )}

        {activeTab === "payment_methods" && (
          <button
            onClick={() => setIsPmModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Forma de Pagamento</span>
          </button>
        )}

        {activeTab === "users" && currentUser?.is_admin && (
          <button
            onClick={() => setIsUserModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        )}
      </div>

      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border flex items-center space-x-2 transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Abas de Navegação */}
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

        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "users"
              ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuários ({users.length})</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : activeTab === "categories" ? (
        /* Aba 1: Grid de Categorias */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
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
      ) : activeTab === "payment_methods" ? (
        /* Aba 2: Grid de Formas de Pagamento */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
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
      ) : (
        /* Aba 3: Gestão de Usuários */
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {!currentUser?.is_admin ? (
            <div className="p-8 text-center">
              <Shield className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Acesso Restrito
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Apenas usuários administradores podem gerenciar novos acessos ao sistema.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Usuário</th>
                    <th className="px-6 py-3.5">Papel</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Cadastrado em</th>
                    <th className="px-6 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                          <span>{u.username}</span>
                          {isSelf && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              Você
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                              u.is_admin
                                ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                            }`}
                          >
                            {u.is_admin && <Shield className="w-3 h-3 mr-1 text-purple-600 inline" />}
                            {u.is_admin ? "Administrador" : "Usuário"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                              u.is_active
                                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {u.is_active ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 inline" />
                                Ativo
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1 text-rose-600 inline" />
                                Inativo
                              </>
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDate(u.created_at)}
                        </td>

                        <td className="px-6 py-4 text-right space-x-2">
                          {/* Redefinir Senha */}
                          <button
                            onClick={() => handleOpenResetPassword(u)}
                            className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Alterar Senha"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Ativar / Desativar */}
                          {!isSelf && (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.is_active
                                  ? "text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                  : "text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              }`}
                              title={u.is_active ? "Desativar acesso" : "Ativar acesso"}
                            >
                              {u.is_active ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Excluir Usuário */}
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
              placeholder="Ex: Cartão Nubank, Dinheiro, Cartão Itaú"
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

      {/* Modal Novo Usuário */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Cadastrar Novo Usuário"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nome de Usuário (Login) *
            </label>
            <input
              type="text"
              required
              minLength={3}
              placeholder="Ex: joao, maria, financeiro"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Senha de Acesso (Mínimo 6 caracteres) *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsAdmin}
                onChange={(e) => setNewIsAdmin(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Privilégio de Administrador do Sistema
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Criar Usuário
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Redefinir Senha */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setSelectedUserForPassword(null);
        }}
        title={`Alterar Senha de ${selectedUserForPassword?.username || ""}`}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nova Senha (Mínimo 6 caracteres) *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setSelectedUserForPassword(null);
              }}
              className="px-4 py-2 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Salvar Nova Senha
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
