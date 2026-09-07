import React, { useState } from "react";
import {
  LogIn,
  AlertCircle,
  Sun,
  Moon,
  Loader2,
  Wallet,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { AuthResponse } from "../types";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Preencha o usuário e a senha.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
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

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 selection:bg-blue-600 selection:text-white">
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
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-blue-400/25 via-blue-500/15 to-cyan-400/20 dark:from-blue-600/35 dark:via-blue-500/20 dark:to-cyan-400/25 blur-[120px] pointer-events-none animate-pulse" />
      <div
        className="absolute -bottom-32 -right-32 w-[560px] h-[560px] rounded-full bg-gradient-to-tl from-cyan-400/20 via-blue-400/20 to-sky-300/15 dark:from-cyan-500/30 dark:via-blue-600/25 dark:to-sky-400/20 blur-[130px] pointer-events-none animate-pulse"
        style={{ animationDuration: "6s" }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

      {/* Alternador de Tema no Canto Superior Direito */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-2xl bg-white/80 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-xl shadow-md hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
          title={isDark ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
          aria-label="Alternar Tema"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-blue-600" />}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CARD PRINCIPAL GLASSMORPHIC */}
      {/* ========================================================================= */}
      <div className="w-full max-w-md relative z-10 backdrop-blur-2xl bg-white/85 dark:bg-zinc-900/75 border border-zinc-200/80 dark:border-zinc-800/90 rounded-3xl p-8 sm:p-9 shadow-2xl shadow-blue-500/10 dark:shadow-blue-950/40 transition-all">
        {/* Marca & Logotipo com Gradiente Azul e Ciano */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
              <Wallet className="w-7 h-7" />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-blue-500/20 blur-md -z-10" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center justify-center space-x-2">
            <span>Wallet</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              Finanças
            </span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
            Entre com suas credenciais para acessar a plataforma
          </p>
        </div>

        {/* Mensagem de Erro Semântica */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-2.5 text-rose-700 dark:text-rose-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulário com Ícones e Efeito de Foco Azul */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Usuário do Sistema
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Informe seu usuário"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                title={showPassword ? "Ocultar senha" : "Exibir senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botão de Ação com Gradiente Azul e Ciano */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
