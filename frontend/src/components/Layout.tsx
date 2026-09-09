import React, { useState, useEffect } from "react";
import { Header } from "./Header";
import { ChangelogModal } from "./ChangelogModal";
import { walletApi } from "../api/walletApi";
import { NavTab } from "../types";

interface LayoutProps {
  children: React.ReactNode;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentTab, onSelectTab }) => {
  const [isChangelogOpen, setIsChangelogOpen] = useState<boolean>(false);
  const [currentVersion, setCurrentVersion] = useState<string>("1.0.1");
  const [hasUnseenVersion, setHasUnseenVersion] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    walletApi
      .getSystemVersion()
      .then((res) => {
        if (!isMounted) return;
        setCurrentVersion(res.current_version);
        const seenVersion = localStorage.getItem("wallet_last_seen_version");
        if (!seenVersion || seenVersion !== res.current_version) {
          setHasUnseenVersion(true);
        }
      })
      .catch(() => {
        // Fallback silencioso mantendo 1.0.1
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleVersionSeen = () => {
    setHasUnseenVersion(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Menu Superior no Topo */}
      <Header
        currentTab={currentTab}
        onSelectTab={onSelectTab}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Rodapé com Versão Ativa e Link de Detalhes */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 px-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center justify-center space-x-1.5">
            <span>wallet</span>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setIsChangelogOpen(true)}
              className="relative inline-flex items-center gap-1 font-mono font-medium text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 hover:underline transition-colors focus:outline-none cursor-pointer"
              title="Ver detalhes da versão"
            >
              <span>v{currentVersion}</span>
              {hasUnseenVersion && (
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" title="Nova versão disponível" />
              )}
            </button>
          </div>
        </footer>
      </div>

      {/* Modal Global de Notas de Versão */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
        onVersionSeen={handleVersionSeen}
      />
    </div>
  );
};

