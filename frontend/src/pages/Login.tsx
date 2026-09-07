import React, { useState } from "react";
import {
  LogIn,
  UserPlus,
  AlertCircle,
  Sun,
  Moon,
  Loader2,
  Wallet,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  Coins,
  Database,
  ArrowRight,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { AuthResponse } from "../types";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isRegister) {
        // Fluxo de Cadastro
        await api.post("/auth/register", {
          username: username.trim(),
          password: password.trim(),
        });
        setIsRegister(false);
        setErrorMsg(null);
      }

      // Fluxo de Login (OAuth2 Password Request Form)
      const params = new URLSearchParams();
      params.append("username", username.trim());
      params.append("password", password.trim());

      const res = await api.post<AuthResponse>("/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      login(res.data.access_token, res.data.user);
    } catch (err: unknown) {
      let message = "Ocorreu uma falha na autenticação. Verifique suas credenciais.";
      if (typeof err === "object" && err !== null && "response" in err) {
        const responseData = (err as { response?: { data?: { detail?: string } } }).response?.data;
        if (responseData?.detail) {
          message = responseData.detail;
        }
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFillDemo = () => {
    setUsername("admin");
    setPassword("admin123");
    setIsRegister(false);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-hidden bg-zinc-950 transition-colors selection:bg-blue-600 selection:text-white">
      {/* ========================================================================= */}
      {/* FUNDO INOVADOR: Grade Geométrica & Orbs Luminosos com Blur Profundo */}
      {/* ========================================================================= */}
      {/* Malha de Linhas / Grade High-Tech */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(59, 130, 246, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59, 130, 246, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, #000 30%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, #000 30%, transparent 90%)",
        }}
      />

      {/* Orbs Luminosos Fluídos */}
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-blue-600/35 via-blue-500/20 to-cyan-400/25 blur-[120px] pointer-events-none animate-pulse" />
      <div
        className="absolute -bottom-32 -right-32 w-[560px] h-[560px] rounded-full bg-gradient-to-tl from-cyan-500/30 via-blue-600/25 to-sky-400/20 blur-[130px] pointer-events-none animate-pulse"
        style={{ animationDuration: "6s" }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

      {/* Alternador de Tema no Canto Superior Direito */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 text-zinc-300 border border-zinc-800/80 backdrop-blur-xl shadow-lg transition-all hover:scale-105"
          title={isDark ? "Modo Claro" : "Modo Escuro"}
          aria-label="Alternar Tema"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-blue-400" />}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CARD PRINCIPAL GLASSMORPHIC */}
      {/* ========================================================================= */}
      <div className="w-full max-w-md relative z-10 backdrop-blur-2xl bg-zinc-900/75 border border-zinc-800/90 rounded-3xl p-8 sm:p-9 shadow-2xl shadow-blue-950/40 transition-all">
        {/* Marca & Logotipo com Gradiente Azul e Ciano */}
        <div className="text-center mb-7">
          <div className="relative inline-block mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
              <Wallet className="w-7 h-7" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-blue-500/20 blur-md -z-10" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center space-x-2">
            <span>Wallet</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Finanças
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gestão inteligente de despesas com precisão absoluta em centavos
          </p>
        </div>

        {/* Alternador Segmentado (Login / Cadastro) */}
        <div className="p-1 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center mb-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
              !isRegister
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Acessar Conta</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
              isRegister
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar Nova Conta</span>
          </button>
        </div>

        {/* Mensagem de Erro Semântica */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/60 flex items-start space-x-2.5 text-rose-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulário com Ícones e Efeito de Foco Azul */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Usuário do Sistema
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: admin"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                title={showPassword ? "Ocultar senha" : "Exibir senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botão de Ação com Efeito Gradiente Azul e Ciano */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Finalizar Cadastro e Entrar</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Atalho de Demonstração / Auto-preenchimento */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-zinc-400">Credenciais padrão:</span>
            <span className="text-xs font-mono text-zinc-300 font-semibold">
              admin &bull; admin123
            </span>
          </div>
          <button
            type="button"
            onClick={handleQuickFillDemo}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors flex items-center space-x-1"
          >
            <span>Preencher</span>
          </button>
        </div>

        {/* Micro-Badges de Tecnologias e Segurança */}
        <div className="mt-6 pt-4 border-t border-zinc-800/60 grid grid-cols-3 gap-2 text-[10px] text-zinc-400 text-center">
          <div className="flex flex-col items-center space-y-1 p-2 rounded-xl bg-zinc-950/40 border border-zinc-800/40">
            <Coins className="w-3.5 h-3.5 text-blue-400" />
            <span className="leading-tight">Centavos Inteiros</span>
          </div>
          <div className="flex flex-col items-center space-y-1 p-2 rounded-xl bg-zinc-950/40 border border-zinc-800/40">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="leading-tight">JWT & Bcrypt</span>
          </div>
          <div className="flex flex-col items-center space-y-1 p-2 rounded-xl bg-zinc-950/40 border border-zinc-800/40">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span className="leading-tight">PostgreSQL 16</span>
          </div>
        </div>
      </div>
    </div>
  );
};
