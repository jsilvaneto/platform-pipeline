import React, { useState } from "react";
import { 
  X, Copy, Check, ShieldCheck, 
  Smartphone, Database, Wifi, Lock,
  ArrowRight, Sparkles, Server, HardDrive, 
  Layers, CheckCircle2, Terminal, Camera, RefreshCw
} from "lucide-react";

interface MobileAppGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppGuideModal: React.FC<MobileAppGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const steps = [
    {
      id: 1,
      title: "1. Arquitetura 100% Offline-First (Room DB)",
      shortTitle: "Offline-First",
      icon: Database,
    },
    {
      id: 2,
      title: "2. Endereço da API & Conectividade",
      shortTitle: "Conexão REST",
      icon: Server,
    },
    {
      id: 3,
      title: "3. Sincronização Direta com WorkManager",
      shortTitle: "SyncWorker",
      icon: RefreshCw,
    },
    {
      id: 4,
      title: "4. Comprovantes, Câmera & Biometria",
      shortTitle: "Câmera & Segurança",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100">
        
        {/* Header do Modal */}
        <div className="p-5 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Guia do Aplicativo Android (Offline-First)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Fase 2 Mobile
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Comunicação direta com a API REST FastAPI, sem dependência do Google Planilhas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Horizontal */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = activeStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStep(s.id)}
                className={`py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-zinc-800/80 shadow-sm"
                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-500" : "text-zinc-400"}`} />
                <span className="truncate">{s.shortTitle}</span>
              </button>
            );
          })}
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* PASSO 1: ARQUITETURA OFFLINE-FIRST */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60">
                <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                    Como Funciona o Modo Offline no Android?
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    O aplicativo utiliza o <strong>Room Database (SQLite local)</strong> como fonte primária de verdade. Toda inserção de receita, despesa, foto de comprovante ou alteração cadastral é gravada instantaneamente no dispositivo com latência inferior a 10ms.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                    <Wifi className="w-4 h-4 text-emerald-500" />
                    <span>Lançamentos na Rua (Sem Internet)</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                    Ao registrar um gasto no trânsito ou restaurante sem sinal de rede, o item é gravado no Room com status <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px]">sync_status = "PENDENTE"</code>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                    <RefreshCw className="w-4 h-4 text-teal-500" />
                    <span>Sincronização Automática</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                    Assim que o aparelho detecta conectividade (Wi-Fi, 4G/5G ou VPN), o <strong>WorkManager</strong> dispara a sincronização em lote diretamente para a API REST do Wallet.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-2">
                <h5 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span>Entidades Sincronizadas no Cache Local</span>
                </h5>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  O Room armazena cópia local de: <strong>Transações</strong>, <strong>Categorias & Natureza</strong>, <strong>Contas & Carteiras</strong>, <strong>Cartões de Crédito</strong>, <strong>Formas de Pagamento</strong>, <strong>Itens com Valores Sugeridos</strong>, <strong>Contatos</strong>, <strong>Dívidas</strong>, <strong>Orçamentos</strong> e <strong>Metas</strong>.
                </p>
              </div>
            </div>
          )}

          {/* PASSO 2: CONFIGURAÇÃO DE CONEXÃO REST */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60">
                <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                    Endereço Base da API REST (FastAPI)
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    No aplicativo Android, configure a URL base da API apontando para o seu servidor Wallet:
                  </p>
                </div>
              </div>

              {/* Tabela de URLs por Ambiente */}
              <div className="space-y-2.5">
                <h5 className="font-bold text-zinc-900 dark:text-zinc-100">Exemplos de Configuração de URL:</h5>
                
                {/* Emulador Android Studio */}
                <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Emulador Android Studio:</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Loopback especial do emulador para a máquina host WSL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      http://10.0.2.2:8000/
                    </code>
                    <button
                      onClick={() => handleCopy("http://10.0.2.2:8000/", "emu")}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                      title="Copiar URL"
                    >
                      {copiedText === "emu" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                    </button>
                  </div>
                </div>

                {/* Aparelho Físico no Wi-Fi Local */}
                <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Aparelho Físico (Mesma Rede Wi-Fi):</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">IP local da máquina host na sua rede doméstica/escritório</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                      http://192.168.x.x:8000/
                    </code>
                    <button
                      onClick={() => handleCopy("http://192.168.1.100:8000/", "ip")}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                      title="Copiar Modelo"
                    >
                      {copiedText === "ip" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                    </button>
                  </div>
                </div>

                {/* Remoto via Tailscale / VPN */}
                <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block">Acesso Remoto Seguro (VPN / Tailscale):</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Acesse de qualquer lugar via 4G/5G sem expor portas públicas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px] text-teal-600 dark:text-teal-400 font-bold">
                      http://100.x.y.z:8000/
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 3: SINCRONIZAÇÃO WORKMANAGER */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/60">
                <RefreshCw className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-teal-950 dark:text-teal-200">
                    Contratos REST de Sincronização Direta
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    O aplicativo mobile comunica-se diretamente com os seguintes endpoints da API:
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold font-mono text-[10px]">
                        POST
                      </span>
                      <code className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                        /api/v1/sync/mobile/push
                      </code>
                    </div>
                    <span className="text-[10px] text-zinc-400">Mobile $\rightarrow$ Servidor</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                    Envia em lote todas as transações criadas, quitadas ou alteradas offline no Room. O backend realiza upsert idempotente preservando os UUIDs gerados no cliente.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold font-mono text-[10px]">
                        GET
                      </span>
                      <code className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                        /api/v1/sync/mobile/pull?profile=PESSOAL
                      </code>
                    </div>
                    <span className="text-[10px] text-zinc-400">Servidor $\rightarrow$ Mobile</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                    Baixa o conjunto consolidado de categorias, contas, formas de pagamento, itens, contatos e transações com suporte a filtro delta por <code className="text-[10px] font-mono">since=[ISO_TIMESTAMP]</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 4: CÂMERA & SEGURANÇA */}
          {activeStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60">
                <Camera className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-amber-950 dark:text-amber-200">
                    Comprovantes na Câmera & Autenticação Biométrica
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    Captura instantânea de recibos e segurança de ponta a ponta:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                    <Camera className="w-4 h-4 text-emerald-500" />
                    <span>Upload Direto de Comprovantes</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                    Fotos capturadas via <strong>CameraX</strong> são salvas localmente no app e enviadas para <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px]">POST /api/v1/attachments/upload</code>, sendo gravadas no diretório físico do servidor.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                    <Lock className="w-4 h-4 text-indigo-500" />
                    <span>Desbloqueio por Biometria</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                    Integração com <strong>AndroidX Biometric</strong> (Digital / Face Unlock) e armazenamento seguro de tokens JWT no <strong>EncryptedSharedPreferences</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé do Modal com Navegação entre Passos */}
        <div className="p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer"
              >
                Voltar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeStep < 4 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.min(4, prev + 1))}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Próximo Passo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Entendido! Fechar Guia</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
