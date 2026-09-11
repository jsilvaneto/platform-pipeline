import React from "react";
import {
  Sun,
  Moon,
  LogOut,
  LayoutDashboard,
  Wallet,
  Users,
  Settings,
  Shield,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { NavTab } from "../types";

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo & Navegação Desktop */}
        <div className="flex items-center space-x-8">
          <div
            onClick={() => onSelectTab("inicio")}
            className="flex items-center space-x-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                Wallet
              </span>
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 leading-tight mt-0.5">
                Finanças Pessoais
              </span>
            </div>
          </div>

          {/* Links de Navegação Desktop */}
          <nav className="hidden md:flex space-x-1.5">
            <button
              onClick={() => onSelectTab("inicio")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                currentTab === "inicio"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Início</span>
            </button>

            <button
              onClick={() => onSelectTab("registros")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                currentTab === "registros"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Registros</span>
            </button>

            <button
              onClick={() => onSelectTab("contatos")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                currentTab === "contatos"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Contatos</span>
            </button>

            <button
              onClick={() => onSelectTab("configuracoes")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                currentTab === "configuracoes"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Configurações</span>
            </button>
          </nav>
        </div>

        {/* Lado Direito: Tema & Usuário */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Alternador de Tema */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={isDark ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
            aria-label="Alternar Tema"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Badge do Usuário & Logout */}
          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {user.username}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center justify-end space-x-0.5">
                  {user.is_admin && <Shield className="w-2.5 h-2.5 text-blue-500 inline mr-0.5" />}
                  <span>{user.is_admin ? "Administrador" : "Usuário"}</span>
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                title="Encerrar Sessão"
                aria-label="Encerrar Sessão"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Navegação Mobile */}
      <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-around bg-white/95 dark:bg-zinc-900/95">
        <button
          onClick={() => onSelectTab("inicio")}
          className={`text-xs font-medium py-1.5 px-3 rounded-xl flex items-center space-x-1.5 ${
            currentTab === "inicio"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 font-semibold"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Início</span>
        </button>

        <button
          onClick={() => onSelectTab("registros")}
          className={`text-xs font-medium py-1.5 px-3 rounded-xl flex items-center space-x-1.5 ${
            currentTab === "registros"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 font-semibold"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Registros</span>
        </button>

        <button
          onClick={() => onSelectTab("contatos")}
          className={`text-xs font-medium py-1.5 px-3 rounded-xl flex items-center space-x-1.5 ${
            currentTab === "contatos"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 font-semibold"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Contatos</span>
        </button>

        <button
          onClick={() => onSelectTab("configuracoes")}
          className={`text-xs font-medium py-1.5 px-3 rounded-xl flex items-center space-x-1.5 ${
            currentTab === "configuracoes"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 font-semibold"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configurações</span>
        </button>
      </div>
    </header>
  );
};
