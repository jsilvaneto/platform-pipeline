import React, { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Header } from "./components/Header";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { CreditCards } from "./pages/CreditCards";
import { Planning } from "./pages/Planning";
import { Settings } from "./pages/Settings";
import { api } from "./api/client";
import { 
  LayoutDashboard, ListFilter, TrendingUp, Settings as SettingsIcon, 
  Wallet as WalletIcon, Lock, User as UserIcon, LogIn, AlertCircle,
  CreditCard as CreditCardIcon
} from "lucide-react";

const AuthScreen: React.FC = () => {
  const { setToken, loginTheme } = useApp();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);
      const res = await api.post("/auth/login", formData);
      setToken(res.data.access_token);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Falha na autenticação. Verifique seu usuário e senha.");
    } finally {
      setLoading(false);
    }
  };

  const isDarkLogin = loginTheme === "dark";

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
      isDarkLogin ? "bg-zinc-950 text-zinc-100" : "bg-gradient-to-br from-slate-100 via-zinc-100 to-slate-200 text-zinc-900"
    }`}>
      <div className={`w-full max-w-md rounded-3xl p-8 space-y-6 shadow-2xl transition-all ${
        isDarkLogin 
          ? "bg-zinc-900/90 border border-zinc-800 shadow-emerald-950/20" 
          : "bg-white border border-zinc-200/80 shadow-slate-300/60"
      }`}>
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/25">
            <WalletIcon className="w-6 h-6" />
          </div>
          <h1 className={`text-2xl font-black tracking-tight ${isDarkLogin ? "text-zinc-100" : "text-zinc-900"}`}>
            Wallet
          </h1>
          <p className={`text-xs ${isDarkLogin ? "text-zinc-400" : "text-zinc-500"}`}>
            Sistema Financeiro Pessoal & Empresarial
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className={`p-3 text-xs font-semibold rounded-xl border flex items-center gap-2 animate-fade-in ${
            isDarkLogin 
              ? "bg-rose-950/40 text-rose-400 border-rose-800/50" 
              : "bg-rose-50 text-rose-600 border-rose-200"
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
              isDarkLogin ? "text-zinc-300" : "text-zinc-700"
            }`}>
              <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
              <span>Usuário</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Digite seu usuário"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${
                isDarkLogin 
                  ? "bg-zinc-800/60 border border-zinc-700 text-zinc-100 placeholder-zinc-500" 
                  : "bg-zinc-50 border border-zinc-300 text-zinc-900 placeholder-zinc-400"
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
              isDarkLogin ? "text-zinc-300" : "text-zinc-700"
            }`}>
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Senha</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Digite sua senha"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${
                isDarkLogin 
                  ? "bg-zinc-800/60 border border-zinc-700 text-zinc-100 placeholder-zinc-500" 
                  : "bg-zinc-50 border border-zinc-300 text-zinc-900 placeholder-zinc-400"
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? "Entrando..." : "Entrar no Sistema"}</span>
          </button>
        </form>

        {/* Helper Note */}
        <div className="pt-2 text-center">
          <p className={`text-[11px] ${isDarkLogin ? "text-zinc-500" : "text-zinc-400"}`}>
            Acesso padrão inicial: Usuário <strong>admin</strong> e Senha <strong>admin</strong>
          </p>
        </div>

      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { token } = useApp();
  const [activeTab, setActiveTab] = useState<"dashboard" | "transactions" | "credit-cards" | "planning" | "settings">("dashboard");

  if (!token) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors">
      <Header onNavigateToSync={() => setActiveTab("settings")} />

      {/* Main Tab Navigation */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm sticky top-16 z-20">
        <div className="w-full max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex items-center gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "dashboard"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("transactions")}
            className={`flex items-center gap-2 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "transactions"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Lançamentos</span>
          </button>

          <button
            onClick={() => setActiveTab("credit-cards")}
            className={`flex items-center gap-2 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "credit-cards"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <CreditCardIcon className="w-4 h-4" />
            <span>Cartões & Faturas</span>
          </button>

          <button
            onClick={() => setActiveTab("planning")}
            className={`flex items-center gap-2 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "planning"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Planejamento & Futuro</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "settings"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Configurações & Cadastros</span>
          </button>
        </div>
      </div>

      {/* Page Main Content */}
      <main className="flex-1 w-full max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
        {activeTab === "dashboard" && <Dashboard onNavigateToPlanning={() => setActiveTab("planning")} />}
        {activeTab === "transactions" && <Transactions />}
        {activeTab === "credit-cards" && <CreditCards />}
        {activeTab === "planning" && <Planning />}
        {activeTab === "settings" && <Settings />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
