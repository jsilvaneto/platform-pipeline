import React from "react";
import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
  currentTab: "dashboard" | "items";
  onSelectTab: (tab: "dashboard" | "items") => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentTab, onSelectTab }) => {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <Header currentTab={currentTab} onSelectTab={onSelectTab} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Base Application Template &bull; FastAPI + React 19 + PostgreSQL
      </footer>
    </div>
  );
};
