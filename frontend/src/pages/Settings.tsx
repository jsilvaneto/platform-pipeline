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
  Database,
  Activity,
  Server,
  Layers,
  Coins,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Cpu,
  Wallet,
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
  SystemDiagnosticsResponse,
} from "../types";
import { formatDate } from "../utils/format";

const COLOR_PRESETS = [
  "#ef4444", // Vermelho
  "#f97316", // Laranja
  "#f59e0b", // Âmbar
  "#10b981", // Esmeralda
  "#06b6d4", // Ciano
  "#2563eb", // Azul Royal
  "#0284c7", // Azul Céu
  "#0d9488", // Teal
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
  const [activeTab, setActiveTab] = useState<"categories" | "payment_methods" | "users" | "system">("categories");

  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnosticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDiagLoading, setIsDiagLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal Category
  const [isCatModalOpen, setIsCatModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>("");
  const [newCatColor, setNewCatColor] = useState<string>("#2563eb");

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

  const loadDiagnostics = useCallback(async () => {
    setIsDiagLoading(true);
    try {
      const diagData = await walletApi.getSystemDiagnostics();
      setDiagnostics(diagData);
    } catch {
      console.error("Erro ao carregar diagnósticos do sistema.");
    } finally {
      setIsDiagLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === "system") {
      loadDiagnostics();
    }
  }, [activeTab, loadDiagnostics]);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
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
      showFeedback("error", "Erro ao cadastrar categoria.");
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
    } catch (err: unknown) {
      let msg = "Erro ao cadastrar usuário.";
      if (typeof err === "object" && err !== null && "response" in err) {
        const responseData = (err as { response?: { data?: { detail?: string } } }).response?.data;
        if (responseData?.detail) {
          msg = responseData.detail;
        }
      }
      showFeedback("error", msg);
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
        `Usuário "${userToUpdate.username}" ${!userToUpdate.is_active ? "ativado" : "desativado"}.`
      );
      loadData();
    } catch {
      showFeedback("error", "Erro ao alterar status do usuário.");
    }
  };

  const handleOpenPasswordModal = (userTarget: User) => {
    setSelectedUserForPassword(userTarget);
    setResetPasswordValue("");
    setIsPasswordModalOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
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
      setResetPasswordValue("");
      setSelectedUserForPassword(null);
      showFeedback("success", "Senha redefinida com sucesso!");
    } catch {
      showFeedback("error", "Erro ao redefinir senha do usuário.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (userToDelete.id === currentUser?.id) {
      showFeedback("error", "Você não pode excluir seu próprio usuário logado.");
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${userToDelete.username}"?`)) {
      return;
    }
    try {
      await walletApi.deleteUser(userToDelete.id);
      showFeedback("success", "Usuário excluído com sucesso.");
      loadData();
    } catch (err: unknown) {
      let msg = "Erro ao excluir usuário.";
      if (typeof err === "object" && err !== null && "response" in err) {
        const responseData = (err as { response?: { data?: { detail?: string } } }).response?.data;
        if (responseData?.detail) {
          msg = responseData.detail;
        }
      }
      showFeedback("error", msg);
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
            Gerencie categorias, meios de pagamento, usuários e diagnósticos da infraestrutura
          </p>
        </div>

        {/* Botão de Ação dinâmico com base na aba ativa */}
        {activeTab === "categories" && (
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Categoria</span>
          </button>
        )}

        {activeTab === "payment_methods" && (
          <button
            onClick={() => setIsPmModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Forma de Pagamento</span>
          </button>
        )}

        {activeTab === "users" && currentUser?.is_admin && (
          <button
            onClick={() => setIsUserModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        )}

        {activeTab === "system" && (
          <button
            onClick={loadDiagnostics}
            disabled={isDiagLoading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isDiagLoading ? "animate-spin" : ""}`} />
            <span>Atualizar Diagnósticos</span>
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

      {/* Abas de Navegação (com Aba de Sistema & Infraestrutura) */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "categories"
              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
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
              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
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
              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuários ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("system")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "system"
              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Sistema & Infraestrutura</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
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
                <div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                    {cat.name}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Criada em {formatDate(cat.created_at)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Excluir Categoria"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-400 text-sm">
              Nenhuma categoria cadastrada ainda.
            </div>
          )}
        </div>
      ) : activeTab === "payment_methods" ? (
        /* Aba 2: Formas de Pagamento */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                    {pm.name}
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    {PAYMENT_TYPE_LABELS[pm.type] || pm.type}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDeletePaymentMethod(pm.id, pm.name)}
                className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Excluir Forma de Pagamento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {paymentMethods.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-400 text-sm">
              Nenhuma forma de pagamento cadastrada.
            </div>
          )}
        </div>
      ) : activeTab === "users" ? (
        /* Aba 3: Gestão de Usuários */
        <div className="space-y-4">
          {!currentUser?.is_admin ? (
            <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-500">
              <Shield className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="font-semibold text-sm">Acesso Restrito</p>
              <p className="text-xs text-zinc-400 mt-1">
                Apenas usuários com privilégios de Administrador podem gerenciar contas de acesso.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Usuário</th>
                    <th className="py-3.5 px-4">Papel</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Cadastro</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                          <div className="flex items-center space-x-2">
                            <span>{u.username}</span>
                            {isSelf && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                Você
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              u.is_admin
                                ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                            }`}
                          >
                            {u.is_admin && <Shield className="w-3 h-3 mr-1 text-blue-600 inline" />}
                            {u.is_admin ? "Administrador" : "Usuário"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              u.is_active
                                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {u.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          {/* Redefinir Senha */}
                          <button
                            onClick={() => handleOpenPasswordModal(u)}
                            className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Redefinir Senha"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Alternar Status Ativo / Inativo */}
                          {!isSelf && (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                                u.is_active
                                  ? "text-zinc-400 hover:text-amber-600"
                                  : "text-emerald-600 hover:text-emerald-700"
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
      ) : activeTab === "system" ? (
        /* Aba 4: Diagnósticos de Sistema & Infraestrutura */
        <div className="space-y-6">
          {/* Grid dos 4 Cards de Diagnóstico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Banco de Dados PostgreSQL */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                      Banco de Dados Relacional
                    </h3>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      PostgreSQL 16 &bull; Driver Assíncrono
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  {diagnostics?.database.status === "connected" ? "Conectado" : "Verificando"}
                </span>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Motor de Banco</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {diagnostics?.database.engine || "PostgreSQL 16"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Driver & ORM</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    {diagnostics?.database.driver || "asyncpg / SQLAlchemy 2.0"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Latência de Query</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {diagnostics?.database.latency_ms ? `${diagnostics.database.latency_ms} ms` : "..."}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Armazenamento Financeiro</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {diagnostics?.database.currency_storage_mode || "Centavos Inteiros"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Precisão Residual Decimal</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Zero Resíduo (100% Exato)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Aplicação & Servidor */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                      Servidor & Aplicação Backend
                    </h3>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      FastAPI &bull; Python 3.10 &bull; Uvicorn
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  v{diagnostics?.application.version || "1.0.0"}
                </span>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Framework Web</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {diagnostics?.application.framework || "FastAPI + Python 3.10"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Ambiente de Execução</span>
                  <span className="font-semibold text-emerald-600 capitalize">
                    {diagnostics?.application.environment || "Development"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Autenticação & Token</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    {diagnostics?.application.auth_algorithm || "HS256 (JWT Bearer)"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Hash de Credenciais</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    {diagnostics?.application.password_hasher || "bcrypt (12 rounds)"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Última Coleta</span>
                  <span className="text-zinc-500">
                    {diagnostics?.timestamp ? new Date(diagnostics.timestamp).toLocaleTimeString("pt-BR") : "Agora"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Volumetria de Dados do Domínio */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span>Volumetria do Domínio em Tempo Real</span>
              </h3>
              <span className="text-xs text-zinc-400">Registros persistidos no PostgreSQL</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                  <Tag className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {diagnostics?.volumetrics.total_categories ?? categories.length}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Categorias
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-2">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {diagnostics?.volumetrics.total_payment_methods ?? paymentMethods.length}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Formas de Pgto
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {diagnostics?.volumetrics.total_expenses ?? 0}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Despesas Criadas
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {diagnostics?.volumetrics.total_payments ?? 0}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Parcelas / Fluxo
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex flex-col items-center text-center col-span-2 sm:col-span-1">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {diagnostics?.volumetrics.total_users ?? users.length}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Usuários Ativos
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Políticas de Domínio & DevSecOps */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Políticas de Integridade, DevSecOps & Boas Práticas</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5 mb-1">
                  <Coins className="w-4 h-4 text-blue-500" />
                  <span>Cálculos em Centavos</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Proibição estrita de float/decimal para cálculos monetários. Soma de parcelas com compensação do último centavo.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5 mb-1">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Resíduo Zero em Testes</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Todos os testes operam com rollback em transação ou limpeza obrigatória no bloco finally. Zero dados órfãos.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-1.5 mb-1">
                  <Cpu className="w-4 h-4 text-cyan-500" />
                  <span>Tipagem Estrita</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Proibição terminante do tipo any no TypeScript e omissão de tipos no Python. Contratos OpenAPI sincronizados.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal Nova Categoria */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Cadastrar Categoria de Despesa"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Nome da Categoria
            </label>
            <input
              type="text"
              required
              placeholder="ex: Alimentação, Moradia, Lazer"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Cor de Identificação
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCatColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    newCatColor === color ? "scale-125 ring-2 ring-blue-500 ring-offset-2" : ""
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsCatModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white"
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
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Identificação do Meio
            </label>
            <input
              type="text"
              required
              placeholder="ex: Cartão Nubank, Conta Itaú, Carteira Dinheiro"
              value={newPmName}
              onChange={(e) => setNewPmName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Tipo da Operação
            </label>
            <select
              value={newPmType}
              onChange={(e) => setNewPmType(e.target.value as PaymentMethodType)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(PAYMENT_TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsPmModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white"
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
        title="Cadastrar Novo Usuário no Sistema"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Nome de Usuário (Login)
            </label>
            <input
              type="text"
              required
              placeholder="ex: joaosilva"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Senha Inicial (mínimo 6 caracteres)
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="newIsAdmin"
              checked={newIsAdmin}
              onChange={(e) => setNewIsAdmin(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <label
              htmlFor="newIsAdmin"
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              Conceder privilégios de Administrador
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isSubmitting ? "Salvando..." : "Criar Usuário"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Redefinir Senha */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={`Redefinir Senha: ${selectedUserForPassword?.username || ""}`}
        maxWidth="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Nova Senha (mínimo 6 caracteres)
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isSubmitting ? "Atualizando..." : "Salvar Nova Senha"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
