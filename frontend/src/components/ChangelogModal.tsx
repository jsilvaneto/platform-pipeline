import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Wrench,
  CheckCircle2,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Modal } from "./Modal";
import { walletApi } from "../api/walletApi";
import { SystemVersionResponse } from "../types";
import { formatDate } from "../utils/format";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVersionSeen?: (version: string) => void;
}

type FilterCategory = "all" | "improvements" | "fixes";

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
  onVersionSeen,
}) => {
  const [data, setData] = useState<SystemVersionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchVersionData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await walletApi.getSystemVersion();
        if (isMounted) {
          setData(response);
          // Marca versão como vista no localStorage
          localStorage.setItem("wallet_last_seen_version", response.current_version);
          if (onVersionSeen) {
            onVersionSeen(response.current_version);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError("Não foi possível carregar as notas de versão neste momento.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchVersionData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, onVersionSeen]);

  const renderFormattedItem = (text: string) => {
    // Renderiza **destaques** em negrito
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span>
        {parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-100">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        })}
      </span>
    );
  };

  const totalImprovements =
    data?.releases.reduce((acc, r) => acc + r.improvements.length, 0) || 0;
  const totalFixes =
    data?.releases.reduce((acc, r) => acc + r.fixes.length, 0) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notas de Lançamento & Novidades"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Banner de Versão Ativa & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-900/50 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                  Wallet
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white shadow-xs">
                  v{data?.current_version || "1.0.1"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Histórico de atualizações, melhorias contínuas e correções
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Versão Mais Recente</span>
          </div>
        </div>

        {/* Filtros por Categoria */}
        <div className="flex items-center space-x-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeFilter === "all"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            Todas as Mudanças
          </button>
          <button
            onClick={() => setActiveFilter("improvements")}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeFilter === "improvements"
                ? "bg-emerald-600 text-white"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Melhorias ({totalImprovements})</span>
          </button>
          <button
            onClick={() => setActiveFilter("fixes")}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeFilter === "fixes"
                ? "bg-amber-600 text-white"
                : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Correções ({totalFixes})</span>
          </button>
        </div>

        {/* Conteúdo: Lista de Versões */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Carregando histórico de versões...
            </span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center space-x-3 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : data && data.releases.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6 divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.releases.map((release) => {
              const showImprovements =
                (activeFilter === "all" || activeFilter === "improvements") &&
                release.improvements.length > 0;
              const showFixes =
                (activeFilter === "all" || activeFilter === "fixes") &&
                release.fixes.length > 0;

              if (!showImprovements && !showFixes) {
                return null;
              }

              return (
                <div key={release.version} className="pt-5 first:pt-0 space-y-4">
                  {/* Cabeçalho da Release */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        v{release.version}
                      </span>
                      {release.is_current && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Versão Atual
                        </span>
                      )}
                    </div>

                    {release.release_date && (
                      <div className="flex items-center space-x-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {formatDate(release.release_date)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Highlights se houver */}
                  {release.highlights && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
                      {release.highlights}
                    </p>
                  )}

                  {/* Seção de Melhorias */}
                  {showImprovements && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Melhorias & Novidades</span>
                      </div>
                      <ul className="space-y-1.5 pl-2">
                        {release.improvements.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start space-x-2 leading-relaxed"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            <span>{renderFormattedItem(item)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Seção de Correções */}
                  {showFixes && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Correções & Ajustes</span>
                      </div>
                      <ul className="space-y-1.5 pl-2">
                        {release.fixes.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start space-x-2 leading-relaxed"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                            <span>{renderFormattedItem(item)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Nenhuma nota de versão catalogada.
          </div>
        )}

        {/* Rodapé do Modal */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center space-x-1">
            <span>Arquivo documentado via CHANGELOG.md</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};
