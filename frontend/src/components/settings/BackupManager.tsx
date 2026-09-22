import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  Download,
  RotateCcw,
  RefreshCw,
  HardDrive,
  Clock,
  ShieldCheck,
  FileCode,
  Settings,
  Trash2,
  FolderCheck,
  Sparkles,
  Paperclip,
} from "lucide-react";

import { walletApi } from "../../api/walletApi";
import { Modal } from "../Modal";
import {
  BackupItem,
  BackupStatusResponse,
  StorageConfigResponse,
} from "../../types";

export const BackupManager: React.FC = () => {
  const [statusData, setStatusData] = useState<BackupStatusResponse | null>(null);
  const [storageConfig, setStorageConfig] = useState<StorageConfigResponse | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal de Configuração de Diretórios de Armazenamento (Host / Windows / WSL)
  const [isStorageModalOpen, setIsStorageModalOpen] = useState<boolean>(false);
  const [backupsDirInput, setBackupsDirInput] = useState<string>("");
  const [attachmentsDirInput, setAttachmentsDirInput] = useState<string>("");
  const [storageRetentionInput, setStorageRetentionInput] = useState<number>(30);
  const [isSavingStorage, setIsSavingStorage] = useState<boolean>(false);

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
      const [statusRes, listRes, storageRes] = await Promise.all([
        walletApi.getBackupStatus(),
        walletApi.getBackups(),
        walletApi.getStorageConfig().catch(() => null),
      ]);
      setStatusData(statusRes);
      setBackups(listRes.items);
      if (storageRes) {
        setStorageConfig(storageRes);
        setBackupsDirInput(storageRes.backups.configured_path);
        setAttachmentsDirInput(storageRes.attachments.configured_path);
        setStorageRetentionInput(storageRes.backup_retention_days);
      }
    } catch {
      showNotification("error", "Erro ao carregar dados de backup e armazenamento.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackupData();
  }, [loadBackupData]);

  const handleOpenStorageModal = () => {
    if (storageConfig) {
      setBackupsDirInput(storageConfig.backups.configured_path);
      setAttachmentsDirInput(storageConfig.attachments.configured_path);
      setStorageRetentionInput(storageConfig.backup_retention_days);
    }
    setIsStorageModalOpen(true);
  };

  const handleSaveStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupsDirInput.trim() || !attachmentsDirInput.trim()) {
      showNotification("error", "Informe os diretórios de backups e anexos.");
      return;
    }
    setIsSavingStorage(true);
    try {
      const updated = await walletApi.updateStorageConfig({
        backups_dir: backupsDirInput.trim(),
        attachments_dir: attachmentsDirInput.trim(),
        backup_retention_days: storageRetentionInput,
      });
      setStorageConfig(updated);
      showNotification("success", "Diretórios de armazenamento validados e salvos com sucesso!");
      setIsStorageModalOpen(false);
      await loadBackupData();
    } catch (err: unknown) {
      let msg = "Falha ao salvar diretórios de armazenamento.";
      if (typeof err === "object" && err !== null && "response" in err) {
        const resData = (err as { response?: { data?: { detail?: string } } }).response?.data;
        if (resData?.detail) {
          msg = resData.detail;
        }
      }
      showNotification("error", msg);
    } finally {
      setIsSavingStorage(false);
    }
  };

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
      await walletApi.downloadBackup(item.id, item.filename);
      showNotification("success", `Download de "${item.filename}" iniciado.`);
    } catch {
      showNotification("error", `Falha ao baixar o arquivo "${item.filename}".`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (item: BackupItem) => {
    if (!window.confirm(`Tem certeza que deseja excluir o backup "${item.filename}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setDeletingId(item.id);
    try {
      await walletApi.deleteBackup(item.id);
      showNotification("success", `Backup "${item.filename}" excluído com sucesso.`);
      await loadBackupData();
    } catch {
      showNotification("error", `Falha ao excluir o backup "${item.filename}".`);
    } finally {
      setDeletingId(null);
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
        source: "local",
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

  const formatIsoDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de Notificação */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium border transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
              : feedback.type === "warning"
              ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-4 text-[11px] underline opacity-70 hover:opacity-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cabeçalho Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Backups & Armazenamento</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Gerenciamento de snapshots do banco de dados e diretórios locais sincronizados com o Google Drive Desktop / WSL.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={loadBackupData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer"
            title="Atualizar lista e status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
          >
            {isCreatingBackup ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gerando Snapshot...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Fazer Backup Agora</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Seção de Armazenamento no Host / Google Drive Offline */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FolderCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  Diretórios de Armazenamento (Host / Google Drive Offline)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Sincronização Ativa
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Os backups e anexos são salvos diretamente nas pastas locais do seu computador e sincronizados pelo Google Drive Desktop.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenStorageModal}
            className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configurar Diretórios</span>
          </button>
        </div>

        {/* Grade com Diagnóstico dos 2 Diretórios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Diretório de Backups */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-blue-500" />
                <span>Pasta de Backups</span>
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  storageConfig?.backups.is_writable
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                }`}
              >
                {storageConfig?.backups.is_writable ? "Conectado & Gravável" : "Sem Permissão"}
              </span>
            </div>

            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span>Caminho:</span>
                <span
                  className="font-mono text-zinc-800 dark:text-zinc-200 max-w-[210px] truncate text-[11px]"
                  title={storageConfig?.backups.configured_path}
                >
                  {storageConfig?.backups.configured_path || "storage/backups"}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span>Espaço Livre:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {storageConfig?.backups.free_space_pretty || "Calculando..."}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span>Arquivos Salvos:</span>
                <span className="text-zinc-800 dark:text-zinc-200">
                  {storageConfig?.backups.files_count ?? backups.length} dump(s) ({storageConfig?.backups.total_files_size_pretty || "0 B"})
                </span>
              </div>
            </div>
          </div>

          {/* Diretório de Anexos */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center space-x-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                <span>Pasta de Anexos & Comprovantes</span>
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  storageConfig?.attachments.is_writable
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                }`}
              >
                {storageConfig?.attachments.is_writable ? "Conectado & Gravável" : "Sem Permissão"}
              </span>
            </div>

            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span>Caminho:</span>
                <span
                  className="font-mono text-zinc-800 dark:text-zinc-200 max-w-[210px] truncate text-[11px]"
                  title={storageConfig?.attachments.configured_path}
                >
                  {storageConfig?.attachments.configured_path || "storage/attachments"}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span>Espaço Livre:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {storageConfig?.attachments.free_space_pretty || "Calculando..."}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span>Anexos Salvos:</span>
                <span className="text-zinc-800 dark:text-zinc-200">
                  {storageConfig?.attachments.files_count ?? 0} arquivo(s) ({storageConfig?.attachments.total_files_size_pretty || "0 B"})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Volumetria & Estatísticas */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                Diagnóstico dos Snapshots
              </h3>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Resumo dos arquivos locais disponíveis para restauração imediata
              </span>
            </div>
          </div>

          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            <Database className="w-3.5 h-3.5 mr-1" />
            {statusData?.local_backups_count ?? backups.length} dump(s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/70">
            <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Espaço em Disco</span>
            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-sm mt-0.5 block">
              {statusData?.total_disk_usage_pretty || "0 B"}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/70">
            <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Último Backup</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200 text-xs mt-0.5 flex items-center space-x-1 truncate">
              <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">
                {statusData?.last_backup_at ? formatIsoDate(statusData.last_backup_at) : "Nenhum recente"}
              </span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/70">
            <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Retenção Automática</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 text-xs mt-0.5 block">
              {statusData?.retention_days || 30} dias
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/70">
            <span className="text-zinc-500 dark:text-zinc-400 block text-[11px]">Formato de Gravação</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>pg_dump -Fc</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tabela de Backups Disponíveis */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <Database className="w-4 h-4 text-blue-500" />
              <span>Histórico de Snapshots Disponíveis ({backups.length})</span>
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Arquivos .dump gravados no armazenamento local e sincronizados
            </span>
          </div>
        </div>

        {backups.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Arquivo de Snapshot</th>
                  <th className="py-3.5 px-4">Tamanho</th>
                  <th className="py-3.5 px-4">Data de Criação</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {backups.map((item) => (
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
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center space-x-1 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Baixar arquivo no computador"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenRestoreModal(item)}
                          className="px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                          title="Restaurar banco a partir deste snapshot"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Excluir arquivo de backup"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
              <Database className="w-6 h-6" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              Nenhum backup encontrado na pasta local. Clique no botão <strong>Fazer Backup Agora</strong> para gerar o primeiro snapshot do banco.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Restauração */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => !isRestoring && setIsRestoreModalOpen(false)}
        title="Restaurar Banco de Dados"
        maxWidth="md"
      >
        <form onSubmit={handleExecuteRestore} className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-2">
            <div className="font-bold flex items-center space-x-2 text-rose-700 dark:text-rose-400">
              <RotateCcw className="w-4 h-4" />
              <span>Atenção: Ação Destrutiva Irreversível</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              A restauração apagará todas as despesas, pagamentos, categorias e configurações atuais e as substituirá pelo estado gravado no snapshot selecionado:
            </p>
            <div className="font-mono bg-white dark:bg-zinc-900 p-2 rounded-xl border border-rose-200 dark:border-rose-800 font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              {selectedBackupForRestore?.filename}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Para prosseguir, digite <strong className="text-rose-600 dark:text-rose-400 select-all font-mono">RESTAURAR</strong> no campo abaixo:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Digite RESTAURAR"
              required
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              disabled={isRestoring}
              onClick={() => setIsRestoreModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isRestoring || confirmInput.trim().toUpperCase() !== "RESTAURAR"}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Restaurando Banco...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Confirmar Restauração</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Configuração de Armazenamento no Host / Windows / WSL */}
      {isStorageModalOpen && (
        <Modal
          isOpen={isStorageModalOpen}
          onClose={() => setIsStorageModalOpen(false)}
          title="Configurar Diretórios de Armazenamento (Host / Windows / WSL)"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveStorage} className="space-y-5">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Informe os caminhos onde os backups e anexos serão gravados. Você pode informar caminhos do Windows (ex: <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded font-mono text-[11px]">C:\Users\jsilvaneto\drive\wallet\backups</code>) ou caminhos WSL/Linux. O sistema converterá e testará automaticamente a gravação.
            </p>

            {/* Sugestões Automáticas Detectadas no Host */}
            {storageConfig?.detected_suggestions && storageConfig.detected_suggestions.length > 0 && (
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 rounded-2xl space-y-2">
                <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Google Drive Desktop detectado no seu computador:</span>
                </div>
                {storageConfig.detected_suggestions.map((sugg, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-indigo-100 dark:border-indigo-900 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                        {sugg.label}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {sugg.backups_dir}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBackupsDirInput(sugg.backups_dir);
                        setAttachmentsDirInput(sugg.attachments_dir);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-colors"
                    >
                      Preencher com esta pasta
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Campos de Entrada */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Diretório de Backups (PostgreSQL)
                </label>
                <input
                  type="text"
                  value={backupsDirInput}
                  onChange={(e) => setBackupsDirInput(e.target.value)}
                  placeholder="Ex: C:\Users\jsilvaneto\drive\wallet\backups"
                  required
                  className="w-full text-xs font-mono py-2 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-200"
                />
                <span className="text-[11px] text-zinc-400 block mt-1">
                  Onde os arquivos .dump do banco de dados serão gravados e sincronizados.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Diretório de Anexos do Sistema (Comprovantes, Notas Fiscais, etc.)
                </label>
                <input
                  type="text"
                  value={attachmentsDirInput}
                  onChange={(e) => setAttachmentsDirInput(e.target.value)}
                  placeholder="Ex: C:\Users\jsilvaneto\drive\wallet\anexos"
                  required
                  className="w-full text-xs font-mono py-2 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-200"
                />
                <span className="text-[11px] text-zinc-400 block mt-1">
                  Onde os documentos anexados nos lançamentos serão guardados.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Dias de Retenção de Backups
                </label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={storageRetentionInput}
                  onChange={(e) => setStorageRetentionInput(Number(e.target.value))}
                  required
                  className="w-32 text-xs py-2 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-200"
                />
                <span className="text-[11px] text-zinc-400 block mt-1">
                  Backups mais antigos que esse período serão limpos automaticamente.
                </span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsStorageModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingStorage}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer shadow-xs"
              >
                {isSavingStorage ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testando e Salvando...</span>
                  </>
                ) : (
                  <>
                    <FolderCheck className="w-3.5 h-3.5" />
                    <span>Testar e Salvar Diretórios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
