import React from "react";
import { Sun, Moon, LogOut, LayoutDashboard, Layers, Shield } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  currentTab: "dashboard" | "items";
  onSelectTab: (tab: "dashboard" | "items") => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
              B
            </div>
            <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
              BaseApp
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden sm:flex space-x-1">
            <button
              onClick={() => onSelectTab("dashboard")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === "dashboard"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => onSelectTab("items")}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === "items"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Itens Scaffold</span>
            </button>
          </nav>
        </div>

        {/* User Actions & Theme Toggle */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={isDark ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
            aria-label="Alternar Tema"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Badge */}
          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {user.username}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center justify-end space-x-0.5">
                  {user.is_admin && <Shield className="w-2.5 h-2.5 text-indigo-500 inline mr-0.5" />}
                  {user.is_admin ? "Administrador" : "Operador"}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Sair do Sistema"
                aria-label="Encerrar Sessão"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
