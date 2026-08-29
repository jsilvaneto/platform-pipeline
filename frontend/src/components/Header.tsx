import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { 
  Sun, Moon, Eye, EyeOff, RefreshCw, LogOut, 
  User as UserIcon, Building2, Wallet as WalletIcon, 
  Smartphone, CheckCircle2, AlertCircle, 
  Settings as SettingsIcon, Server, Database,
  ChevronDown, HardDrive
} from "lucide-react";

interface HeaderProps {
  onNavigateToSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateToSync }) => {
  const { 
    profile, setProfile, isDark, toggleTheme, 
    hideValues, toggleHideValues, setToken,
    syncStatus, isSyncing, triggerSync, refreshSyncStatus
  } = useApp();

  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRefreshStatus = async () => {
    setFeedback(null);
    const res = await triggerSync();
    setFeedback({
      type: res.success ? "success" : "error",
      message: res.message,
    });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const formatLastSync = (dateStr?: string | null) => {
    if (!dateStr) return "Nenhuma sincronização recente";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + 
        " (" + d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + ")";
    } catch {
      return dateStr;
    }
  };

  const isOnline = syncStatus?.api_online ?? true;

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="w-full max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between">
        
        {/* Left: Brand + Profile Selector */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <WalletIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                Wallet
              </span>
            </div>
          </div>

          {/* Profile Switcher */}
          <div className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg flex items-center gap-1 border border-zinc-200/80 dark:border-zinc-700/60">
            <button
              onClick={() => setProfile("PESSOAL")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                profile === "PESSOAL"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Pessoal</span>
            </button>
            <button
              onClick={() => setProfile("EMPRESA")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                profile === "EMPRESA"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Empresa</span>
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          
          {/* Feedback Toast Inline */}
          {feedback && (
            <div className={`hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl border animate-fade-in ${
              feedback.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50"
            }`}>
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              )}
              <span className="max-w-[260px] truncate">{feedback.message}</span>
            </div>
          )}

          {/* ========================================== */}
          {/* BOTÃO DE STATUS DA API / MOBILE SYNC       */}
          {/* ========================================== */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsOpenMenu((prev) => !prev)}
              title="Status da API REST e Sincronização Mobile"
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border shadow-sm transition-all select-none cursor-pointer ${
                isSyncing
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                  : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60"
              }`}
            >
              {/* Ícone com indicador de pulso */}
              <div className="relative flex items-center justify-center">
                <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
              </div>

              {/* Rótulo Principal */}
              <span className="hidden sm:inline font-bold">
                API REST & Mobile
              </span>

              <span className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                <CheckCircle2 className="w-3 h-3" />
                <span>Online</span>
              </span>

              <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isOpenMenu ? "rotate-180" : ""}`} />
            </button>

            {/* ========================================== */}
            {/* POPOVER / DROPDOWN DE SINCRONIZAÇÃO MOBILE */}
            {/* ========================================== */}
            {isOpenMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-4 space-y-3.5 z-50 animate-fade-in text-zinc-900 dark:text-zinc-100">
                
                {/* Cabeçalho do Popover */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 border border-emerald-200 dark:border-emerald-800/60">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">API REST & Mobile Sync</h4>
                      <p className="text-[10px] text-zinc-400">Comunicação Direta (Offline-First)</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>API Ativa</span>
                  </span>
                </div>

                {/* Cards de Métricas Operacionais */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Total de Lançamentos */}
                  <div className="p-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                        <Database className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Transações</span>
                      </span>
                      <span className="text-xs font-bold font-mono px-1.5 py-0.2 bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-700">
                        {syncStatus?.total_transactions ?? 0}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Base SQLite WAL local.
                    </p>
                  </div>

                  {/* Armazenamento de Comprovantes */}
                  <div className="p-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                        <HardDrive className="w-3.5 h-3.5 text-teal-500" />
                        <span>Comprovantes</span>
                      </span>
                      <span className="text-xs font-bold font-mono px-1.5 py-0.2 bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-700">
                        {syncStatus?.total_attachments ?? 0}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Armazenamento em disco.
                    </p>
                  </div>
                </div>

                {/* Detalhes da Conexão e Último Sync */}
                <div className="px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Último sync mobile:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold text-[10px]">
                      {formatLastSync(syncStatus?.last_sync_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Modo de Operação:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      100% Offline-First (Room)
                    </span>
                  </div>
                </div>

                {/* Botão de Verificação */}
                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => {
                      handleRefreshStatus();
                    }}
                    className="w-full py-2 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>{isSyncing ? "Verificando API..." : "Verificar Conexão da API"}</span>
                  </button>
                </div>

                {/* Rodapé com Atalho de Configurações */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                  <span className="text-[10px] text-zinc-400">
                    Porta: 8000 (FastAPI)
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpenMenu(false);
                      if (onNavigateToSync) onNavigateToSync();
                    }}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <SettingsIcon className="w-3 h-3" />
                    <span>Guia do App Mobile</span>
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Hide/Show Values */}
          <button
            onClick={toggleHideValues}
            title={hideValues ? "Mostrar Valores" : "Ocultar Valores"}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 shadow-sm transition-all cursor-pointer"
          >
            {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Modo Claro" : "Modo Escuro"}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 shadow-sm transition-all cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* Logout */}
          <button
            onClick={() => setToken(null)}
            title="Encerrar Sessão"
            className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 shadow-sm transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
