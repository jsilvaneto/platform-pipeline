import React, { useEffect, useState } from "react";
import { Layers, Clock, PlayCircle, CheckCircle2, Server, ArrowUpRight, Plus } from "lucide-react";
import { api } from "../api/client";
import { Item } from "../types";
import { useAuth } from "../context/AuthContext";

interface DashboardProps {
  onNavigateToItems: () => void;
  onOpenNewItemModal: () => void;
}

interface SystemHealth {
  status: string;
  database: string;
  version: string;
  environment: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToItems,
  onOpenNewItemModal,
}) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, healthRes] = await Promise.all([
          api.get<Item[]>("/items"),
          api.get<SystemHealth>("/health").catch(() => null),
        ]);
        setItems(itemsRes.data);
        if (healthRes) setHealth(healthRes.data);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalItems = items.length;
  const pendingCount = items.filter((i) => i.status === "PENDENTE").length;
  const inProgressCount = items.filter((i) => i.status === "EM_ANDAMENTO").length;
  const completedCount = items.filter((i) => i.status === "CONCLUIDO").length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner de Boas-Vindas & Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-indigo-900/20 via-indigo-600/10 to-transparent border border-indigo-200/50 dark:border-indigo-900/30">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Olá, {user?.username || "Visitante"} 👋
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Painel consolidado e monitoramento do seu projeto base.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenNewItemModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center space-x-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Item Scaffold</span>
          </button>
        </div>
      </div>

      {/* Grid de Cards KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Itens */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Total de Itens
            </span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {isLoading ? "..." : totalItems}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Pendentes */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Pendentes
            </span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {isLoading ? "..." : pendingCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Em Andamento */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Em Andamento
            </span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {isLoading ? "..." : inProgressCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <PlayCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Concluídos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Concluídos
            </span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              {isLoading ? "..." : completedCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Seção Inferior: Status do Sistema & Atalhos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status de Infra / Saúde */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <Server className="w-4 h-4 text-indigo-500" />
              <span>Saúde do Sistema</span>
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Online
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Banco de Dados</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">
                {health?.database || "PostgreSQL"}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Ambiente</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200 capitalize">
                {health?.environment || "development"}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Versão da API</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">
                v{health?.version || "1.0.0"}
              </span>
            </div>
          </div>
        </div>

        {/* Atalho Rápido para Itens */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Módulo Scaffold Demonstrativo
              </h3>
              <button
                onClick={onNavigateToItems}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center space-x-1 hover:underline cursor-pointer"
              >
                <span>Ver lista completa</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              O módulo de Itens serve como modelo funcional ponta a ponta (SQLAlchemy 2.0 + Pydantic v2 + React 19) para servir de base quando você ou um agente de IA for adicionar novas entidades.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 dark:divide-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {totalItems} itens cadastrados no total
            </span>
            <button
              onClick={onNavigateToItems}
              className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-medium transition-colors"
            >
              Abrir Gestor de Itens
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
