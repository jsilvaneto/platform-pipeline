import React, { useState, useEffect, useCallback } from "react";
import {
  Cloud,
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  Zap,
  Clock,
  Database,
  Info,
} from "lucide-react";
import { walletApi } from "../../api/walletApi";
import {
  WalletIntegrationResponse,
  WalletIntegrationTestResponse,
} from "../../types";
import { formatDate } from "../../utils/format";

export const WalletIntegrationSettings: React.FC = () => {
  const [integration, setIntegration] = useState<WalletIntegrationResponse | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<WalletIntegrationTestResponse | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  const loadIntegration = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await walletApi.getWalletIntegration();
      setIntegration(data);
    } catch {
      setFeedback({
        type: "error",
        message: "Não foi possível carregar as configurações de integração.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegration();
  }, [loadIntegration]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setFeedback({
        type: "error",
        message: "Por favor, informe o token pessoal de acesso à API do Wallet.",
      });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);
      setTestResult(null);
      const updated = await walletApi.saveWalletCredentials({
        api_key: apiKeyInput.trim(),
      });
      setIntegration(updated);
      setApiKeyInput("");
      setFeedback({
        type: "success",
        message: "Token da API Wallet salvo e criptografado com sucesso!",
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Erro ao salvar a chave de API.";
      setFeedback({
        type: "error",
        message: errorMsg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      setFeedback(null);

      const payload = apiKeyInput.trim() ? { api_key: apiKeyInput.trim() } : {};
      const res = await walletApi.testWalletConnection(payload);
      setTestResult(res);

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Conexão bem-sucedida! Latência: ${res.latency_ms}ms.`,
        });
        // Recarrega dados atualizados de rate limit
        await loadIntegration();
      } else {
        setFeedback({
          type: "error",
          message: res.message,
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Falha na comunicação ao tentar testar a conexão com a API.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeleteCredentials = async () => {
    try {
      setIsDeleting(true);
      await walletApi.deleteWalletCredentials();
      setShowConfirmDelete(false);
      setTestResult(null);
      setFeedback({
        type: "info",
        message: "Credenciais de API removidas com sucesso.",
      });
      await loadIntegration();
    } catch {
      setFeedback({
        type: "error",
        message: "Erro ao tentar remover as credenciais.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const isConfigured = integration?.is_configured ?? false;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Resumo do Status */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                isConfigured
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700"
              }`}
            >
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Wallet by BudgetBakers REST API
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  BETA v1
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Integração oficial para leitura, sincronização contínua e análise preditiva.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isConfigured ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                Configurado & Ativo
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
                Não Configurado
              </span>
            )}
          </div>
        </div>

        {/* Métricas de Cota e Revisão */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3.5 border border-zinc-200/70 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              <span>Cota de Requisições</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {integration?.rate_limit_remaining ?? 300}{" "}
              <span className="text-xs font-normal text-zinc-500">/ 300 req/hora</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      ((integration?.rate_limit_remaining ?? 300) / 300) * 100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3.5 border border-zinc-200/70 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              <span>Última Sincronização</span>
              <Clock className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
              {integration?.last_sync_at
                ? formatDate(integration.last_sync_at)
                : "Nunca sincronizado"}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Status: {integration?.last_sync_status || "PENDENTE"}
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3.5 border border-zinc-200/70 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              <span>Watermark de Revisão</span>
              <Database className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
              Rev: {integration?.last_sync_rev ?? "0"}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              X-Last-Data-Change-Rev
            </div>
          </div>
        </div>
      </div>

      {/* Alertas e Feedbacks */}
      {feedback && (
        <div
          className={`flex items-start space-x-3 p-4 rounded-xl border ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
              : feedback.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800"
              : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800"
          }`}
        >
          {feedback.type === "success" && (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          )}
          {feedback.type === "error" && (
            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          {feedback.type === "info" && (
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-medium">{feedback.message}</div>
        </div>
      )}

      {/* Painel Central: Inserção do Token e Gerenciamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Configuração (2 colunas) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Credencial de Acesso (API Key)
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Insira o token pessoal gerado no Wallet web app
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                Token Bearer da API
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={
                    isConfigured && integration?.token_masked
                      ? `Token cadastrado: ${integration.token_masked}`
                      : "Cole aqui o seu token (ex: eyJhbGciOi...)"
                  }
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1"
                  title={showApiKey ? "Ocultar token" : "Exibir token"}
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {isConfigured && integration?.token_masked && (
                <div className="flex items-center space-x-2 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>
                    Chave ativa criptografada:{" "}
                    <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-semibold font-mono">
                      {integration.token_masked}
                    </code>
                  </span>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || (!apiKeyInput.trim() && !isConfigured)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/70 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <Zap className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Testar Conexão</span>
                </button>

                {isConfigured && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remover</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving || !apiKeyInput.trim()}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-xl text-sm shadow-sm transition-all cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>Salvar Credenciais</span>
              </button>
            </div>
          </form>

          {/* Resultado Detalhado do Teste */}
          {testResult && (
            <div
              className={`mt-6 p-4 rounded-xl border text-sm ${
                testResult.success
                  ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
                  : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">
                  {testResult.success ? "Conexão Validada" : "Falha na Validação"}
                </span>
                <span className="text-xs font-mono font-semibold">
                  Status: {testResult.status_code} ({testResult.latency_ms}ms)
                </span>
              </div>
              <p className="text-xs">{testResult.message}</p>
            </div>
          )}
        </div>

        {/* Card Lateral: Blindagem & Instruções */}
        <div className="space-y-6">
          {/* Instruções de Obtenção do Token */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2 mb-3">
              <ExternalLink className="w-4 h-4 text-blue-500" />
              <span>Como obter sua chave</span>
            </h5>
            <ol className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2.5 list-decimal list-inside">
              <li>
                Acesse o aplicativo web do Wallet (
                <a
                  href="https://web.budgetbakers.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline font-medium"
                >
                  web.budgetbakers.com
                </a>
                ).
              </li>
              <li>
                Vá até o menu <strong>Settings</strong> e selecione{" "}
                <strong>REST API</strong>.
              </li>
              <li>
                Clique em <strong>Generate New API Key</strong>.
              </li>
              <li>Copie a chave completa e cole no campo ao lado.</li>
            </ol>
          </div>

          {/* Garantias de Segurança (Zero Exposure) */}
          <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-zinc-800/40 dark:to-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-5">
            <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Garantia de Segurança</span>
            </h5>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
              <li className="flex items-start space-x-1.5">
                <span className="text-emerald-500 font-bold">•</span>
                <span>
                  <strong>Criptografia AES-256 em repouso:</strong> O token é
                  armazenado cifrado no PostgreSQL.
                </span>
              </li>
              <li className="flex items-start space-x-1.5">
                <span className="text-emerald-500 font-bold">•</span>
                <span>
                  <strong>Zero vazamento no navegador:</strong> As chamadas à
                  API são efetuadas estritamente pelo backend.
                </span>
              </li>
              <li className="flex items-start space-x-1.5">
                <span className="text-emerald-500 font-bold">•</span>
                <span>
                  <strong>Throttling defensivo:</strong> Proteção automática
                  contra estouro da cota de 300 req/hora.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação para Remover Chave */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-6 h-6" />
              <h4 className="text-lg font-bold">Desconectar Integração?</h4>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Esta ação removerá a chave de API criptografada do banco de dados.
              A sincronização contínua com os servidores do Wallet será pausada.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCredentials}
                disabled={isDeleting}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors cursor-pointer"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Confirmar Remoção</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
