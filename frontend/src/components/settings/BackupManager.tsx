import React, { useState, useEffect, useCallback } from "react";
import {
  Cloud,
  Database,
  Download,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HardDrive,
  Clock,
  ShieldCheck,
  FileCode,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { walletApi } from "../../api/walletApi";
import { Modal } from "../Modal";
import {
  BackupItem,
  BackupStatusResponse,
} from "../../types";

export const BackupManager: React.FC = () => {
  const [statusData, setStatusData] = useState<BackupStatusResponse | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [filterSource, setFilterSource] = useState<"all" | "gdrive" | "local">("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showDriveGuide, setShowDriveGuide] = useState<boolean>(false);

  // Modal de Restauração
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState<boolean>(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupItem | null>(null);
  const [confirmInput, setConfirmInput] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Feedback de alerta
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const showNotification = (
    type: "success" | "error" | "warning",
    message: string,
    durationMs: number = 5000
  ) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, durationMs);
  };

  const loadBackupData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statusRes, listRes] = await Promise.all([
        walletApi.getBackupStatus(),
        walletApi.getBackups(),
      ]);
      setStatusData(statusRes);
      setBackups(listRes.items);
    } catch {
      showNotification("error", "Erro ao carregar dados de backup e Google Drive.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackupData();
  }, [loadBackupData]);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const result = await walletApi.createBackup();
      if (result.success) {
        showNotification(
          "success",
          result.message || "Backup gerado com sucesso!"
        );
        await loadBackupData();
      } else {
        showNotification("warning", result.message || "O backup concluiu com alertas.");
      }
    } catch (err: unknown) {
      let msg = "Erro ao executar backup do banco de dados.";
      if (typeof err === "object" && err !== null && "response" in err) {
        const resData = (err as { response?: { data?: { detail?: string } } }).response?.data;
        if (resData?.detail) {
          msg = resData.detail;
        }
      }
      showNotification("error", msg);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownload = async (item: BackupItem) => {
    setDownloadingId(item.id);
    try {
      await walletApi.downloadBackup(item.id, item.source, item.filename);
      showNotification("success", `Download de "${item.filename}" iniciado.`);
    } catch {
      showNotification("error", `Falha ao baixar o arquivo "${item.filename}".`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenRestoreModal = (item: BackupItem) => {
    setSelectedBackupForRestore(item);
    setConfirmInput("");
    setIsRestoreModalOpen(true);
  };

  const handleExecuteRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBackupForRestore) return;
    if (confirmInput.trim().toUpperCase() !== "RESTAURAR") {
      showNotification("error", "Digite exatamente 'RESTAURAR' para confirmar.");
      return;
    }

    setIsRestoring(true);
    try {
      const result = await walletApi.restoreBackup({
        backup_id: selectedBackupForRestore.id,
        source: selectedBackupForRestore.source,
        confirmation_token: "RESTAURAR",
      });

      setIsRestoreModalOpen(false);
      setSelectedBackupForRestore(null);
      setConfirmInput("");
      showNotification("success", result.message || "Banco de dados restaurado com sucesso!");
      await loadBackupData();
    } catch (err: unknown) {
      let msg = "Erro na restauração do banco de dados.";
      if (typeof err === "object" && err !== null && "response" in err) {
        const resData = (err as { response?: { data?: { detail?: string } } }).response?.data;
        if (resData?.detail) {
          msg = resData.detail;
        }
      }
      showNotification("error", msg);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatIsoDate = (isoStr: string): string => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const filteredBackups = backups.filter((b) => {
    if (filterSource === "gdrive") return b.source === "gdrive";
    if (filterSource === "local") return b.source === "local";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium border flex items-center space-x-2 transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : feedback.type === "warning"
              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : feedback.type === "warning" ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header & Botões de Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Gestão de Backups & Google Drive
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Disaster Recovery
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Gere snapshots binários do PostgreSQL, sincronize com a nuvem e restaure versões com segurança
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            type="button"
            onClick={loadBackupData}
            disabled={isLoading || isCreatingBackup}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={isCreatingBackup || isLoading}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all"
          >
            {isCreatingBackup ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gerando Snapshot & Upload...</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                <span>Fazer Backup Agora</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cards de Diagnóstico & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Google Drive */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  Google Drive (Nuvem)
                </h3>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Armazenamento Off-site & Disaster Recovery
                </span>
              </div>
            </div>

            {statusData?.google_drive.connection_ok ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Conectado
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Não Configurado
              </span>
            )}
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Status da Conexão</span>
              <span className="font-medium text-right max-w-[240px] truncate text-zinc-800 dark:text-zinc-200">
                {statusData?.google_drive.status_message || "Verificando..."}
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Conta de Serviço (Bot)</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200 text-[11px] max-w-[240px] truncate">
                {statusData?.google_drive.service_account_email || "credentials.json ausente"}
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">ID da Pasta no Drive</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200 text-[11px] max-w-[240px] truncate">
                {statusData?.google_drive.folder_id || "Não informado"}
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Política de Retenção</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {statusData?.google_drive.retention_days || 30} dias automáticos
              </span>
            </div>
          </div>

          {/* Acordeão de instruções */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDriveGuide(!showDriveGuide)}
              className="w-full flex items-center justify-between text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline pt-2 border-t border-zinc-100 dark:border-zinc-800"
            >
              <span className="flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Como configurar o envio para o Google Drive?</span>
              </span>
              {showDriveGuide ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showDriveGuide && (
              <div className="mt-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Passos rápidos de ativação:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                  <li>
                    Crie uma <strong>Conta de Serviço</strong> no Google Cloud Console com a <em>Google Drive API</em> ativada.
                  </li>
                  <li>
                    Baixe a chave JSON e salve como <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded font-mono">credentials.json</code> na raiz do projeto.
                  </li>
                  <li>
                    Crie uma pasta no seu Google Drive, compartilhe-a com o e-mail da Conta de Serviço dando permissão de <strong>Editor</strong>.
                  </li>
                  <li>
                    Adicione o ID da pasta na variável <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded font-mono">GOOGLE_DRIVE_FOLDER_ID</code> no arquivo <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded font-mono">.env</code>.
                  </li>
                </ol>
                <div className="pt-1">
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline text-[11px]"
                  >
                    <span>Google Cloud Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Volumetria & Estatísticas */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  Volumetria & Armazenamento Local
                </h3>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Snapshots disponíveis para restauração imediata
                </span>
              </div>
            </div>

            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              <HardDrive className="w-3.5 h-3.5 mr-1" />
              {statusData?.local_backups_count ?? 0} locais
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Backups na Nuvem (Drive)</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {statusData?.drive_backups_count ?? 0} arquivos
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Espaço Ocupado em Disco Local</span>
              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                {statusData?.total_disk_usage_pretty || "0 B"}
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Último Backup Realizado</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {statusData?.last_backup_at
                    ? formatIsoDate(statusData.last_backup_at)
                    : "Nenhum backup recente"}
                </span>
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Formato de Gravação</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>PostgreSQL Custom Format (-Fc Comprimido)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Backups Disponíveis */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span>Histórico de Snapshots Disponíveis ({filteredBackups.length})</span>
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Arquivos de dump disponíveis no Google Drive e no armazenamento local
            </span>
          </div>

          {/* Filtros de Origem */}
          <div className="flex items-center space-x-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterSource("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                filterSource === "all"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              Todos ({backups.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterSource("gdrive")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                filterSource === "gdrive"
                  ? "bg-blue-600 text-white"
                  : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
              }`}
            >
              Google Drive ({backups.filter((b) => b.source === "gdrive").length})
            </button>
            <button
              type="button"
              onClick={() => setFilterSource("local")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                filterSource === "local"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              Locais ({backups.filter((b) => b.source === "local").length})
            </button>
          </div>
        </div>

        {filteredBackups.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Arquivo de Snapshot</th>
                  <th className="py-3.5 px-4">Origem</th>
                  <th className="py-3.5 px-4">Tamanho</th>
                  <th className="py-3.5 px-4">Data de Criação</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {filteredBackups.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                          {item.filename}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.source === "gdrive" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <Cloud className="w-3 h-3 mr-1" />
                          Google Drive
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          <HardDrive className="w-3 h-3 mr-1" />
                          Armazenamento Local
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-zinc-600 dark:text-zinc-300">
                      {item.size_pretty}
                    </td>

                    <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400">
                      {formatIsoDate(item.created_at)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          disabled={downloadingId === item.id}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center space-x-1 transition-colors disabled:opacity-50"
                          title="Baixar arquivo no computador"
                        >
                          <Download className={`w-3.5 h-3.5 ${downloadingId === item.id ? "animate-bounce" : ""}`} />
                          <span className="hidden sm:inline">Baixar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenRestoreModal(item)}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center space-x-1 transition-colors"
                          title="Restaurar este snapshot no banco de dados"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Restaurar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
            <Database className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700" />
            <p>Nenhum snapshot de backup encontrado com os filtros selecionados.</p>
            <p className="text-[11px] text-zinc-500">
              Clique em &quot;Fazer Backup Agora&quot; acima para gerar o primeiro snapshot.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Restauração Crítica */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => {
          if (!isRestoring) {
            setIsRestoreModalOpen(false);
            setSelectedBackupForRestore(null);
          }
        }}
        title="Restauração de Banco de Dados (Disaster Recovery)"
        maxWidth="md"
      >
        <form onSubmit={handleExecuteRestore} className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>AVISO CRÍTICO DE SOBREGRAVAÇÃO</span>
            </div>
            <p>
              A restauração é uma operação irreversível que <strong>substituirá todas as tabelas e dados atuais do PostgreSQL</strong> pelo snapshot selecionado.
            </p>
            <p>
              Todos os lançamentos financeiros, pagamentos e alterações cadastradas após a data deste backup serão perdidos.
            </p>
          </div>

          {selectedBackupForRestore && (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs space-y-2">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                Snapshot Selecionado:
              </div>
              <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
                <div>
                  <span className="font-medium">Arquivo:</span>{" "}
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">
                    {selectedBackupForRestore.filename}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Origem:</span>{" "}
                  <span>
                    {selectedBackupForRestore.source === "gdrive"
                      ? "Google Drive"
                      : "Local"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Tamanho:</span>{" "}
                  <span className="font-mono">{selectedBackupForRestore.size_pretty}</span>
                </div>
                <div>
                  <span className="font-medium">Data:</span>{" "}
                  <span>{formatIsoDate(selectedBackupForRestore.created_at)}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Para confirmar, digite <span className="font-mono text-rose-600 font-bold">RESTAURAR</span> abaixo:
            </label>
            <input
              type="text"
              required
              placeholder="RESTAURAR"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={isRestoring}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              disabled={isRestoring}
              onClick={() => {
                setIsRestoreModalOpen(false);
                setSelectedBackupForRestore(null);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isRestoring || confirmInput.trim().toUpperCase() !== "RESTAURAR"}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 flex items-center space-x-2"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Restaurando Banco...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Confirmar e Restaurar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
