import React from "react";
import {
  LayoutDashboard,
  Wallet,
  Settings,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { NavTab } from "../types";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "inicio",
    label: "Início",
    icon: LayoutDashboard,
  },
  {
    id: "registros",
    label: "Registros",
    icon: Wallet,
  },
  {
    id: "configuracoes",
    label: "Configurações",
    icon: Settings,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Backdrop para mobile */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm md:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Container da Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out ${
          isCollapsed ? "md:w-20" : "md:w-64"
        } ${
          isMobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header da Sidebar com Logo e Botão de Fixar/Recolher */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div
            onClick={() => handleNavClick("inicio")}
            className="flex items-center space-x-3 cursor-pointer select-none overflow-hidden"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                  Wallet
                </span>
                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 leading-tight mt-0.5">
                  Finanças Pessoais
                </span>
              </div>
            )}
          </div>

          {/* Botão de Fechar no Mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 md:hidden"
            aria-label="Fechar Menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Botão de Recolher / Fixar no Desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={isCollapsed ? "Expandir / Fixar Menu" : "Recolher Menu"}
            aria-label={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center rounded-xl transition-all duration-150 group ${
                  isCollapsed && !isMobileOpen
                    ? "justify-center p-3"
                    : "space-x-3 px-3.5 py-2.5"
                } ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 font-medium"
                }`}
                title={isCollapsed && !isMobileOpen ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 dark:text-zinc-400"
                  }`}
                />

                {(!isCollapsed || isMobileOpen) && (
                  <span className="text-sm font-medium leading-none truncate">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer da Sidebar: Usuário & Ações */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0 space-y-2 bg-zinc-50/50 dark:bg-zinc-900/50">
          {/* Card do Usuário */}
          <div
            className={`flex items-center rounded-2xl p-2 ${
              isCollapsed && !isMobileOpen ? "justify-center" : "space-x-3"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 text-sm">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col text-left truncate flex-1 min-w-0">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {user?.username}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center space-x-1">
                  {user?.is_admin && <Shield className="w-2.5 h-2.5 text-indigo-500 inline mr-0.5" />}
                  <span>{user?.is_admin ? "Administrador" : "Usuário"}</span>
                </span>
              </div>
            )}
          </div>

          {/* Botões de Ação: Tema & Logout */}
          <div
            className={`flex items-center gap-1 ${
              isCollapsed && !isMobileOpen ? "flex-col justify-center" : "justify-between px-1"
            }`}
          >
            {/* Alternador de Tema */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center space-x-2 text-xs"
              title={isDark ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
              aria-label="Alternar Tema"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {(!isCollapsed || isMobileOpen) && <span>{isDark ? "Claro" : "Escuro"}</span>}
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 rounded-xl text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center space-x-2 text-xs"
              title="Encerrar Sessão"
              aria-label="Encerrar Sessão"
            >
              <LogOut className="w-4 h-4" />
              {(!isCollapsed || isMobileOpen) && <span>Sair</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
