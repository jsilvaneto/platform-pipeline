import React from "react";
import {
  Sun,
  Moon,
  LogOut,
  LayoutDashboard,
  Wallet,
  Tag,
  Shield,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export type NavTab = "dashboard" | "expenses" | "categories";

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-8">
          <div
            onClick={() => onSelectTab("dashboard")}
            className="flex items-center space-x-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                Wallet
              </span>
              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 leading-tight">
                Finanças Pessoais
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => onSelectTab("dashboard")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                currentTab === "dashboard"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab("expenses")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                currentTab === "expenses"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Despesas & Pagamentos</span>
            </button>

            <button
              onClick={() => onSelectTab("categories")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                currentTab === "categories"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Categorias & Meios</span>
            </button>
          </nav>
        </div>

        {/* User Actions & Theme Toggle */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={isDark ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
            aria-label="Alternar Tema"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Badge */}
          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {user.username}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center justify-end space-x-0.5">
                  {user.is_admin && <Shield className="w-2.5 h-2.5 text-indigo-500 inline mr-0.5" />}
                  {user.is_admin ? "Administrador" : "Pessoal"}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                title="Sair do Sistema"
                aria-label="Encerrar Sessão"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-around bg-white/90 dark:bg-zinc-900/90">
        <button
          onClick={() => onSelectTab("dashboard")}
          className={`text-xs font-medium py-1 px-2.5 rounded-lg flex items-center space-x-1 ${
            currentTab === "dashboard"
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 font-semibold"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => onSelectTab("expenses")}
          className={`text-xs font-medium py-1 px-2.5 rounded-lg flex items-center space-x-1 ${
            currentTab === "expenses"
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 font-semibold"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Despesas</span>
        </button>

        <button
          onClick={() => onSelectTab("categories")}
          className={`text-xs font-medium py-1 px-2.5 rounded-lg flex items-center space-x-1 ${
            currentTab === "categories"
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 font-semibold"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Categorias</span>
        </button>
      </div>
    </header>
  );
};
