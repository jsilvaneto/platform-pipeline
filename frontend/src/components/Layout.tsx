import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { NavTab } from "../types";
import { Menu, Wallet } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentTab, onSelectTab }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("wallet_sidebar_collapsed") === "true";
  });
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("wallet_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Menu Lateral */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Barra de Topo Mobile com Hamburger */}
      <header className="md:hidden sticky top-0 z-30 h-14 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Abrir Menu de Navegação"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Wallet
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com Margem Dinâmica */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Wallet &bull; Gestão Financeira Pessoal Inteligente &bull; Valores em Centavos Inteiros
        </footer>
      </div>
    </div>
  );
};
