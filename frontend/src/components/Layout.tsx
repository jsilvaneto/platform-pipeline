import React from "react";
import { Header } from "./Header";
import { NavTab } from "../types";

interface LayoutProps {
  children: React.ReactNode;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentTab, onSelectTab }) => {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Menu Superior no Topo */}
      <Header currentTab={currentTab} onSelectTab={onSelectTab} />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col">
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

