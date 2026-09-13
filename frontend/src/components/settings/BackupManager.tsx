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
  Upload,
  Copy,
  Check,
  Settings,
  Trash2,
  User,
  LogIn,
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

  // Modal de Configuração do Google Drive
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"oauth" | "service_account">("oauth");
  const [configFolderId, setConfigFolderId] = useState<string>("");
  const [configRetentionDays, setConfigRetentionDays] = useState<number>(30);
  const [selectedCredsFile, setSelectedCredsFile] = useState<File | null>(null);
  const [oauthClientId, setOauthClientId] = useState<string>("");
  const [oauthClientSecret, setOauthClientSecret] = useState<string>("");
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState<boolean>(false);
  const [isReplacingFile, setIsReplacingFile] = useState<boolean>(false);

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
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    if (code) {
      const processOAuthCode = async () => {
        setIsConnectingOAuth(true);
        try {
          const uri = `${window.location.origin}${window.location.pathname}`;
          const updatedStatus = await walletApi.exchangeGoogleOAuthCode({
            code,
            redirect_uri: uri,
          });
          setStatusData(updatedStatus);
          window.history.replaceState({}, document.title, window.location.pathname);
          showNotification(
            "success",
            "Conta Google (@gmail.com) conectada com sucesso! Cota pessoal de 15 GB pronta para backups."
          );
          await loadBackupData();
        } catch (err: unknown) {
          let msg = "Falha ao finalizar conexão com a conta Google.";
          if (typeof err === "object" && err !== null && "response" in err) {
            const resData = (err as { response?: { data?: { detail?: string } } }).response?.data;
            if (resData?.detail) {
              msg = resData.detail;
            }
          }
          showNotification("error", msg);
          window.history.replaceState({}, document.title, window.location.pathname);
        } finally {
          setIsConnectingOAuth(false);
        }
      };
      processOAuthCode();
    } else {
      loadBackupData();
    }
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

  const currentRedirectUri = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}`
    : "";

  const handleCopyRedirectUri = () => {
    if (!currentRedirectUri) return;
    navigator.clipboard.writeText(currentRedirectUri);
    setCopiedRedirectUri(true);
    setTimeout(() => setCopiedRedirectUri(false), 2500);
    showNotification("success", "URL de redirecionamento copiada!");
  };

  const handleConnectOAuth = async () => {
    setIsConnectingOAuth(true);
    try {
      if (oauthClientId.trim() && oauthClientSecret.trim()) {
        await walletApi.saveGoogleOAuthClient({
          client_id: oauthClientId.trim(),
          client_secret: oauthClientSecret.trim(),
        });
      }

      if (selectedCredsFile) {
        await walletApi.uploadGoogleDriveCredentials(selectedCredsFile);
      }

      const res = await walletApi.getGoogleOAuthUrl({
        redirect_uri: currentRedirectUri,
        client_id: oauthClientId.trim() || undefined,
        client_secret: oauthClientSecret.trim() || undefined,
      });

      window.location.href = res.auth_url;
    } catch (err: unknown) {
      let msg = "Falha ao iniciar conexão com o Google.";
      if (typeof err === "object" && err !== null && "response" in err) {
        const resData = (err as { response?: { data?: { detail?: string } } }).response?.data;
        if (resData?.detail) {
          msg = resData.detail;
        }
      }
      showNotification("error", msg);
      setIsConnectingOAuth(false);
    }
  };

  const handleOpenConfigModal = () => {
    setConfigFolderId(statusData?.google_drive.folder_id || "");
    setConfigRetentionDays(statusData?.google_drive.retention_days || 30);
    setSelectedCredsFile(null);
    setIsReplacingFile(!statusData?.google_drive.account_email && !statusData?.google_drive.service_account_email);
    if (statusData?.google_drive.auth_type === "service_account") {
      setAuthMode("service_account");
    } else {
      setAuthMode("oauth");
    }
    setIsConfigModalOpen(true);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
    showNotification("success", "E-mail copiado!");
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const updated = await walletApi.testGoogleDriveConnection();
      setStatusData(updated);
      if (updated.google_drive.connection_ok) {
        showNotification("success", "Conexão com o Google Drive ativa e validada!");
      } else {
        showNotification("warning", updated.google_drive.status_message);
      }
    } catch {
      showNotification("error", "Falha ao testar conexão com o Google Drive.");
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      // 1. Se o usuário selecionou um arquivo JSON de credenciais, envia primeiro
      if (selectedCredsFile) {
        await walletApi.uploadGoogleDriveCredentials(selectedCredsFile);
      }

      // 2. Atualiza pasta e retenção
      const finalStatus = await walletApi.updateGoogleDriveConfig({
        folder_id: configFolderId.trim() || null,
        retention_days: Number(configRetentionDays) || 30,
      });

      setStatusData(finalStatus);
      await loadBackupData();

      if (finalStatus.google_drive.connection_ok) {
        showNotification("success", "Google Drive configurado e sincronizado com sucesso!");
        setIsConfigModalOpen(false);
      } else {
        showNotification(
          "warning",
          `Configuração salva, mas atenção: ${finalStatus.google_drive.status_message}`
        );
        setIsConfigModalOpen(false);
      }
    } catch (err: unknown) {
      let msg = "Erro ao salvar configurações do Google Drive.";
      if (typeof err === "object" && err !== null && "response" in err) {
        const resData = (err as { response?: { data?: { detail?: string } } }).response?.data;
        if (resData?.detail) {
          msg = resData.detail;
        }
      }
      showNotification("error", msg);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Deseja realmente desconectar a integração com o Google Drive? Os backups locais serão mantidos."
      )
    ) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const updated = await walletApi.disconnectGoogleDrive();
      setStatusData(updated);
      await loadBackupData();
      showNotification("success", "Google Drive desconectado com sucesso.");
      setIsConfigModalOpen(false);
    } catch {
      showNotification("error", "Falha ao desconectar Google Drive.");
    } finally {
      setIsDisconnecting(false);
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
            ) : statusData?.google_drive.service_account_email ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Configuração Pendente
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Não Configurado
              </span>
            )}
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Status da Conexão</span>
              <span
                className="font-medium text-right max-w-[240px] truncate text-zinc-800 dark:text-zinc-200"
                title={statusData?.google_drive.status_message}
              >
                {statusData?.google_drive.status_message || "Verificando..."}
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">
                {statusData?.google_drive.auth_type === "oauth2"
                  ? "Conta Pessoal Conectada"
                  : "Conta de Serviço (Bot)"}
              </span>
              <div className="flex items-center space-x-1 max-w-[240px]">
                <span className="font-mono text-zinc-800 dark:text-zinc-200 text-[11px] truncate">
                  {statusData?.google_drive.account_email ||
                    statusData?.google_drive.service_account_email ||
                    "Não conectado"}
                </span>
                {(statusData?.google_drive.account_email ||
                  statusData?.google_drive.service_account_email) && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyEmail(
                        statusData.google_drive.account_email ||
                          statusData.google_drive.service_account_email!
                      )
                    }
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    title="Copiar e-mail"
                  >
                    {copiedEmail ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Método de Autenticação</span>
              <span className="font-semibold text-[11px] text-zinc-800 dark:text-zinc-200">
                {statusData?.google_drive.auth_type === "oauth2"
                  ? "OAuth 2.0 (Cota Pessoal 15 GB)"
                  : statusData?.google_drive.auth_type === "service_account"
                  ? "Conta de Serviço (Shared Drive)"
                  : "Não configurado"}
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Destino dos Arquivos</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200 text-[11px] max-w-[240px] truncate">
                {statusData?.google_drive.folder_id ||
                  (statusData?.google_drive.auth_type === "oauth2"
                    ? "Raiz do Meu Drive"
                    : "Não informado")}
              </span>
            </div>

            <div className="py-2.5 flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Política de Retenção</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {statusData?.google_drive.retention_days || 30} dias automáticos
              </span>
            </div>
          </div>

          {/* Botões de Ação do Card */}
          <div className="pt-2 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleOpenConfigModal}
              className="flex-1 flex items-center justify-center space-x-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold py-2 px-3 rounded-xl transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurar Google Drive</span>
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="flex items-center space-x-1 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium py-2 px-3 rounded-xl transition-colors disabled:opacity-50"
              title="Testar Conexão Imediata"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? "animate-spin" : ""}`} />
              <span>Testar</span>
            </button>
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
                <span>Como funciona a configuração 100% pelo painel?</span>
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
                  Instruções fáceis sem tocar em terminal:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                  <li>
                    Clique no botão <strong>Configurar Google Drive</strong> acima.
                  </li>
                  <li>
                    Envie o arquivo <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded font-mono">.json</code> da Conta de Serviço que você baixou do Google Cloud.
                  </li>
                  <li>
                    Copie o e-mail do robô gerado.
                  </li>
                  <li>
                    <strong>Importante sobre cota do Google:</strong> Contas de Serviço têm cota zero no "Meu Drive" pessoal. No Google Drive, utilize um <strong>Drive Compartilhado (Shared Drive)</strong> e adicione o e-mail do robô como <strong>Administrador de Conteúdo</strong>.
                  </li>
                  <li>
                    Cole o link ou ID do Drive Compartilhado (ou pasta interna) e clique em <strong>Salvar e Conectar</strong>.
                  </li>
                </ol>
                <div className="pt-1">
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline text-[11px]"
                  >
                    <span>Abrir Google Cloud Console</span>
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

      {/* Modal de Configuração do Google Drive */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => !isSavingConfig && !isConnectingOAuth && setIsConfigModalOpen(false)}
        title="Configuração do Google Drive (Nuvem)"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Seletor de Modo: Pessoal vs Corporativo */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setAuthMode("oauth")}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                authMode === "oauth"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Conta Pessoal (@gmail.com)</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthMode("service_account")}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                authMode === "service_account"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Workspace (Shared Drive)</span>
            </button>
          </div>

          {/* Conteúdo da Aba 1: OAuth 2.0 Conta Pessoal */}
          {authMode === "oauth" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-2">
                <div className="flex items-center space-x-2 font-semibold text-blue-950 dark:text-blue-100">
                  <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Conexão OAuth 2.0 com sua Conta Pessoal</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  O Google concede <strong>15 GB gratuitos</strong> para contas pessoais. Para que o Wallet salve backups diretamente no seu &quot;Meu Drive&quot; sem erros de cota zero, a autorização é feita em seu nome através do login seguro do Google.
                </p>
              </div>

              {/* Status Atual se já conectado */}
              {statusData?.google_drive.auth_type === "oauth2" && statusData.google_drive.account_email && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                        Conta Google Conectada:
                      </span>
                      <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                        {statusData.google_drive.account_email} (15 GB Pessoais)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectOAuth}
                    disabled={isConnectingOAuth}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-3"
                  >
                    Trocar de Conta
                  </button>
                </div>
              )}

              {/* Passo 1: URI de Redirecionamento */}
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    1. URI de Redirecionamento da Aplicação:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRedirectUri}
                    className="flex items-center space-x-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {copiedRedirectUri ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-[11px] bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 select-all break-all">
                  {currentRedirectUri}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  No Google Cloud Console &gt; <em>Credenciais</em> &gt; <em>ID do cliente OAuth (Aplicativo da Web)</em>, cole este endereço no campo <strong>URIs de redirecionamento autorizados</strong>.
                </p>
              </div>

              {/* Passo 2: Upload do JSON do Cliente OAuth ou digitar chaves */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  2. Credenciais OAuth (Arquivo JSON ou Chaves do Google Cloud)
                </label>
                <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-blue-500 rounded-2xl p-4 text-center transition-colors">
                  <input
                    type="file"
                    id="oauth-creds-input"
                    accept=".json,application/json"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedCredsFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="oauth-creds-input"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                  >
                    <Upload className="w-5 h-5 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {selectedCredsFile ? selectedCredsFile.name : "Clique para selecionar o client_secret_*.json"}
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Arquivo baixado do Google Cloud ao criar o ID do Cliente OAuth
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Ou informe o Client ID:
                    </label>
                    <input
                      type="text"
                      placeholder="...apps.googleusercontent.com"
                      value={oauthClientId}
                      onChange={(e) => setOauthClientId(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Client Secret:
                    </label>
                    <input
                      type="password"
                      placeholder="GOCSPX-..."
                      value={oauthClientSecret}
                      onChange={(e) => setOauthClientSecret(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Passo 3: Botão de Login do Google */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConnectOAuth}
                  disabled={isConnectingOAuth}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isConnectingOAuth ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Conectando ao Google...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>
                        {statusData?.google_drive.auth_type === "oauth2" && statusData.google_drive.account_email
                          ? "Reconectar com Google (@gmail.com)"
                          : "Conectar com Google (@gmail.com)"}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Pasta Opcional & Retenção */}
              <form onSubmit={handleSaveConfig} className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Pasta no Google Drive (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Deixe em branco para salvar na raiz do Meu Drive, ou cole o link/ID da pasta"
                    value={configFolderId}
                    onChange={(e) => setConfigFolderId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Se preferir organizar em uma pasta (ex: <em>Backups Wallet</em>), crie-a no Google Drive e cole o link ou ID aqui.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Período de Retenção Automática (dias)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={configRetentionDays}
                    onChange={(e) => setConfigRetentionDays(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div>
                    {(statusData?.google_drive.account_email || statusData?.google_drive.service_account_email) && (
                      <button
                        type="button"
                        disabled={isSavingConfig || isDisconnecting}
                        onClick={handleDisconnect}
                        className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium hover:underline flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isDisconnecting ? "Desconectando..." : "Desconectar Google Drive"}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      disabled={isSavingConfig}
                      onClick={() => setIsConfigModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Fechar
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingConfig}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 flex items-center space-x-2 shadow-xs transition-all"
                    >
                      {isSavingConfig ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Salvar Ajustes de Pasta</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Conteúdo da Aba 2: Service Account Google Workspace / Shared Drive */}
          {authMode === "service_account" && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center space-x-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Exige Google Workspace (Drive Compartilhado)</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Contas de Serviço (robôs) possuem cota zero em pastas do &quot;Meu Drive&quot;. Elas funcionam exclusivamente em <strong>Drives Compartilhados (Shared Drives)</strong> do Google Workspace corporativo ou educacional.
                </p>
              </div>

              {/* 1. Arquivo de Chave de Conta de Serviço */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  1. Arquivo de Credenciais (.json da Conta de Serviço)
                </label>

                {statusData?.google_drive.service_account_email && !isReplacingFile ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                          Chave de Serviço Ativa:
                        </span>
                        <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 break-all">
                          {statusData.google_drive.service_account_email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReplacingFile(true)}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-3"
                    >
                      Substituir Arquivo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-5 text-center transition-colors">
                      <input
                        type="file"
                        id="gdrive-creds-input"
                        accept=".json,application/json"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedCredsFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="gdrive-creds-input"
                        className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {selectedCredsFile ? selectedCredsFile.name : "Clique para selecionar o arquivo .json da Conta de Serviço"}
                        </span>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          {selectedCredsFile
                            ? `${(selectedCredsFile.size / 1024).toFixed(1)} KB pronto para envio`
                            : "Arquivo de chave baixado do Google Cloud Console"}
                        </span>
                      </label>
                    </div>
                    {statusData?.google_drive.service_account_email && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsReplacingFile(false);
                          setSelectedCredsFile(null);
                        }}
                        className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:underline"
                      >
                        ← Manter chave ativa atual
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Destaque do E-mail para Compartilhamento do Shared Drive */}
              {(statusData?.google_drive.service_account_email || selectedCredsFile) && (
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-950 dark:text-blue-200">
                      Adicione este e-mail no seu Drive Compartilhado:
                    </span>
                    {statusData?.google_drive.service_account_email && (
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(statusData.google_drive.service_account_email!)}
                        className="flex items-center space-x-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:underline"
                      >
                        {copiedEmail ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar E-mail</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <p className="font-mono text-[11px] bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 text-zinc-800 dark:text-zinc-200 select-all break-all">
                    {statusData?.google_drive.service_account_email || "O e-mail será carregado ao salvar o arquivo JSON"}
                  </p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">
                    Acesse o Google Drive, abra o seu <strong>Drive Compartilhado (Shared Drive)</strong>, clique em <strong>Gerenciar participantes</strong> e adicione o e-mail acima como <strong>Administrador de Conteúdo</strong>.
                  </p>
                </div>
              )}

              {/* 3. ID ou Link do Drive Compartilhado */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  2. ID ou Link do Drive Compartilhado (Shared Drive)
                </label>
                <input
                  type="text"
                  placeholder="Cole aqui o ID ou link completo do Drive Compartilhado"
                  value={configFolderId}
                  onChange={(e) => setConfigFolderId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* 4. Retenção de Snapshots */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  3. Período de Retenção Automática (dias)
                </label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={configRetentionDays}
                  onChange={(e) => setConfigRetentionDays(Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Rodapé com Ações */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  {(statusData?.google_drive.account_email || statusData?.google_drive.service_account_email) && (
                    <button
                      type="button"
                      disabled={isSavingConfig || isDisconnecting}
                      onClick={handleDisconnect}
                      className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium hover:underline flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDisconnecting ? "Desconectando..." : "Desconectar Google Drive"}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    disabled={isSavingConfig}
                    onClick={() => setIsConfigModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center space-x-2 shadow-xs transition-all"
                  >
                    {isSavingConfig ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando & Validando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Salvar e Conectar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};
