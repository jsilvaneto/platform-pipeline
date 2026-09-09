import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
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
        onOpenChangelog={() => setIsChangelogOpen(true)}
        appVersion={currentVersion}
        hasUnseenVersion={hasUnseenVersion}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Rodapé com Versão Ativa e Link de Novidades */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 px-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <span>
              Wallet &bull; Gestão Financeira Pessoal Inteligente &bull; Valores em Centavos Inteiros
            </span>
            <span className="hidden sm:inline">&bull;</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                v{currentVersion}
              </span>
              <button
                onClick={() => setIsChangelogOpen(true)}
                className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
                title="Ver o que mudou nesta versão"
              >
                <Sparkles className="w-3 h-3" />
                <span>O que há de novo?</span>
              </button>
            </div>
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

