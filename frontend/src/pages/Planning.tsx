import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { 
  CashflowProjectionResponse, CashflowProjectionItem,
  ScenarioSimulationRequest, ScenarioSimulationResponse,
  RunwayResponse, GoalProjectionResponse, CommittedIncomeResponse
} from "../types";
import { formatCurrency } from "../utils/format";
import { 
  TrendingUp, Sliders, ShieldCheck, Target, Percent, 
  ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2, 
  Clock, RefreshCw, Sparkles, Landmark, PiggyBank, 
  Calendar, Layers, ShieldAlert, ArrowRight, Check,
  Zap, Info, HelpCircle, Flame, Scale, Wallet,
  ChevronRight, CircleDot, AlertCircle, Plus
} from "lucide-react";

type PlanningTab = "PROJECAO" | "CENARIOS" | "RUNWAY" | "METAS" | "COMPROMETIMENTO";

export const Planning: React.FC = () => {
  const { profile, hideValues } = useApp();
  const [activeTab, setActiveTab] = useState<PlanningTab>("PROJECAO");
  const [horizonMonths, setHorizonMonths] = useState<number>(12);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados de dados do backend
  const [projection, setProjection] = useState<CashflowProjectionResponse | null>(null);
  const [runway, setRunway] = useState<RunwayResponse | null>(null);
  const [goalsProj, setGoalsProj] = useState<GoalProjectionResponse | null>(null);
  const [committed, setCommitted] = useState<CommittedIncomeResponse | null>(null);

  // Estados do Simulador de Cenários
  const [simIncomeVar, setSimIncomeVar] = useState<number>(0);
  const [simDiscretionaryCut, setSimDiscretionaryCut] = useState<number>(0);
  const [simNecessaryCut, setSimNecessaryCut] = useState<number>(0);
  const [simMandatoryCut, setSimMandatoryCut] = useState<number>(0);
  const [simExtraExpenseStr, setSimExtraExpenseStr] = useState<string>("0");
  const [simExtraIncomeStr, setSimExtraIncomeStr] = useState<string>("0");
  const [simulationResult, setSimulationResult] = useState<ScenarioSimulationResponse | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Hover states para gráficos SVG
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  // ==========================================
  // CARREGAMENTO DOS DADOS
  // ==========================================
  const fetchPlanningData = async () => {
    setLoading(true);
    try {
      const [projRes, runwayRes, goalsRes, committedRes] = await Promise.all([
        api.get("/planning/projection", { params: { profile, months: horizonMonths } }),
        api.get("/planning/runway", { params: { profile } }),
        api.get("/planning/goals-projection", { params: { profile } }),
        api.get("/planning/committed-income", { params: { profile, months: Math.min(12, horizonMonths) } }),
      ]);

      setProjection(projRes.data);
      setRunway(runwayRes.data);
      setGoalsProj(goalsRes.data);
      setCommitted(committedRes.data);
    } catch (err) {
      console.error("Erro ao carregar dados de planejamento:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanningData();
  }, [profile, horizonMonths]);

  // Executa simulação sempre que os parâmetros mudarem
  const runSimulation = async () => {
    setSimulating(true);
    try {
      const extraExpCents = Math.round(parseFloat(simExtraExpenseStr.replace(/\./g, "").replace(",", ".") || "0") * 100);
      const extraIncCents = Math.round(parseFloat(simExtraIncomeStr.replace(/\./g, "").replace(",", ".") || "0") * 100);

      const payload: ScenarioSimulationRequest = {
        profile,
        months: horizonMonths,
        income_variation_percent: simIncomeVar,
        discretionary_cut_percent: simDiscretionaryCut,
        necessary_cut_percent: simNecessaryCut,
        mandatory_cut_percent: simMandatoryCut,
        additional_monthly_expense_cents: isNaN(extraExpCents) ? 0 : extraExpCents,
        additional_monthly_income_cents: isNaN(extraIncCents) ? 0 : extraIncCents,
      };

      const res = await api.post("/planning/simulate", payload);
      setSimulationResult(res.data);
    } catch (err) {
      console.error("Erro na simulação:", err);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    if (activeTab === "CENARIOS") {
      runSimulation();
    }
  }, [
    activeTab, profile, horizonMonths, simIncomeVar, 
    simDiscretionaryCut, simNecessaryCut, simMandatoryCut,
    simExtraExpenseStr, simExtraIncomeStr
  ]);

  // Presets rápidos para o simulador
  const applyPreset = (
    incomeVar: number,
    discretionaryCut: number,
    necessaryCut: number,
    extraExp: string = "0"
  ) => {
    setSimIncomeVar(incomeVar);
    setSimDiscretionaryCut(discretionaryCut);
    setSimNecessaryCut(necessaryCut);
    setSimMandatoryCut(0);
    setSimExtraExpenseStr(extraExp);
    setSimExtraIncomeStr("0");
  };

  return (
    <div className="space-y-7 pb-12">
      
      {/* 1. CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
              <span>Planejamento Financeiro & Futuro</span>
              <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-black rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 uppercase tracking-wider">
              {profile}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Projeções de fluxo de caixa futuro, simulação de cenários, cálculo de runway e metas patrimoniais
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Seletor de Horizonte */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 shadow-sm">
            {[6, 12, 18, 24].map((m) => (
              <button
                key={m}
                onClick={() => setHorizonMonths(m)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  horizonMonths === m
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {m}M
              </button>
            ))}
          </div>

          <button
            onClick={fetchPlanningData}
            disabled={loading}
            className="p-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Recarregar Projeções"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. BARRA DE ABAS DE NAVEGAÇÃO DO PLANEJAMENTO */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("PROJECAO")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "PROJECAO"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Fluxo Projetado ({horizonMonths}M)</span>
        </button>

        <button
          onClick={() => setActiveTab("CENARIOS")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "CENARIOS"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Simulador de Cenários</span>
        </button>

        <button
          onClick={() => setActiveTab("RUNWAY")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "RUNWAY"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Runway & Reserva</span>
        </button>

        <button
          onClick={() => setActiveTab("METAS")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "METAS"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Metas & Projeção Temporal</span>
        </button>

        <button
          onClick={() => setActiveTab("COMPROMETIMENTO")}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "COMPROMETIMENTO"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Comprometimento de Renda</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* ABA 1: FLUXO DE CAIXA PROJETADO (12M/24M)   */}
      {/* ========================================== */}
      {activeTab === "PROJECAO" && projection && (
        <div className="space-y-6">
          
          {/* CARDS DE KPI DE PROJEÇÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* 1. Saldo Atual de Partida */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Saldo Atual (Caixa)</span>
                <Landmark className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 mt-1.5 tracking-tight font-mono">
                {hideValues ? "R$ ••••••" : formatCurrency(projection.current_balance_cents)}
              </p>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Posição consolidada hoje</span>
            </div>

            {/* 2. Total de Entradas Previstas */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Receitas Previstas ({horizonMonths}M)</span>
                <ArrowDownRight className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1.5 tracking-tight font-mono">
                {hideValues ? "R$ ••••••" : formatCurrency(projection.total_projected_income_cents)}
              </p>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Recorrências + Parcelamentos</span>
            </div>

            {/* 3. Total de Saídas Previstas */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Despesas Previstas ({horizonMonths}M)</span>
                <ArrowUpRight className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1.5 tracking-tight font-mono">
                {hideValues ? "R$ ••••••" : formatCurrency(projection.total_projected_expense_cents)}
              </p>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Custos fixos + Cartões + Dívidas</span>
            </div>

            {/* 4. Resultado Líquido Projetado */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Resultado Líquido</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <p className={`text-lg font-black mt-1.5 tracking-tight font-mono ${
                projection.projected_net_cents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}>
                {hideValues ? "R$ ••••••" : formatCurrency(projection.projected_net_cents)}
              </p>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Entradas menos Saídas</span>
            </div>

            {/* 5. Menor Saldo / Alerta de Liquidez */}
            <div className={`p-4 rounded-2xl border shadow-sm ${
              projection.lowest_balance_cents < 0
                ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${
                  projection.lowest_balance_cents < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500 dark:text-zinc-400"
                }`}>
                  Menor Saldo Previsto
                </span>
                {projection.lowest_balance_cents < 0 ? (
                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <p className={`text-lg font-black mt-1.5 tracking-tight font-mono ${
                projection.lowest_balance_cents < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100"
              }`}>
                {hideValues ? "R$ ••••••" : formatCurrency(projection.lowest_balance_cents)}
              </p>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                {projection.negative_months_count > 0 
                  ? `⚠️ ${projection.negative_months_count} mês(es) com risco de saldo negativo`
                  : "✓ Liquidez saudável em todo o horizonte"}
              </span>
            </div>

          </div>

          {/* GRÁFICO 1: EVOLUÇÃO PATRIMONIAL ACUMULADA (SVG) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Curva de Evolução do Saldo Acumulado ({horizonMonths} Meses)
                </h3>
                <p className="text-xs text-zinc-400">
                  Projeção do saldo final ao término de cada mês somando receitas e subtraindo obrigações
                </p>
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="text-zinc-500">Saldo Acumulado Projetado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-zinc-300 dark:bg-zinc-700 inline-block"></span>
                  <span className="text-zinc-400">Linha D'água (R$ 0,00)</span>
                </div>
              </div>
            </div>

            {/* SVG Gráfico de Curva de Saldo */}
            <div className="w-full h-64 relative pt-4 pb-2">
              {(() => {
                const items = projection.items;
                if (!items || items.length === 0) return null;

                const values = items.map(it => it.accumulated_balance_cents);
                const minVal = Math.min(0, ...values);
                const maxVal = Math.max(100000, ...values);
                const range = maxVal - minVal || 1;

                const svgWidth = 1000;
                const svgHeight = 200;
                const paddingX = 40;
                const paddingY = 20;

                const getX = (idx: number) => paddingX + (idx / (items.length - 1 || 1)) * (svgWidth - 2 * paddingX);
                const getY = (val: number) => svgHeight - paddingY - ((val - minVal) / range) * (svgHeight - 2 * paddingY);

                const zeroY = getY(0);

                const points = items.map((it, idx) => `${getX(idx)},${getY(it.accumulated_balance_cents)}`).join(" ");

                return (
                  <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Linha Zero */}
                    <line
                      x1={paddingX}
                      y1={zeroY}
                      x2={svgWidth - paddingX}
                      y2={zeroY}
                      stroke="currentColor"
                      className="text-zinc-200 dark:text-zinc-800"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />

                    {/* Área sombreada */}
                    <polygon
                      points={`${getX(0)},${zeroY} ${points} ${getX(items.length - 1)},${zeroY}`}
                      fill="url(#areaGradient)"
                    />

                    {/* Linha principal */}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />

                    {/* Pontos interativos */}
                    {items.map((it, idx) => {
                      const cx = getX(idx);
                      const cy = getY(it.accumulated_balance_cents);
                      const isHovered = hoveredMonthIndex === idx;
                      const isNegative = it.accumulated_balance_cents < 0;

                      return (
                        <g key={it.month} className="cursor-pointer">
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isHovered ? 6 : 4}
                            className={`${
                              isNegative
                                ? "fill-rose-500 stroke-white dark:stroke-zinc-900"
                                : "fill-emerald-500 stroke-white dark:stroke-zinc-900"
                            } transition-all duration-200`}
                            strokeWidth="2"
                            onMouseEnter={() => setHoveredMonthIndex(idx)}
                            onMouseLeave={() => setHoveredMonthIndex(null)}
                          />

                          {/* Rótulo de Mês no eixo X */}
                          <text
                            x={cx}
                            y={svgHeight - 2}
                            textAnchor="middle"
                            className="text-[10px] font-mono fill-zinc-400 dark:fill-zinc-500 font-semibold"
                          >
                            {it.month_name}
                          </text>

                          {/* Tooltip Dinâmico */}
                          {isHovered && (
                            <g>
                              <rect
                                x={cx - 65}
                                y={cy - 48}
                                width="130"
                                height="40"
                                rx="8"
                                className="fill-zinc-900 dark:fill-zinc-100 shadow-xl"
                              />
                              <text
                                x={cx}
                                y={cy - 32}
                                textAnchor="middle"
                                className="text-[10px] font-bold fill-zinc-400 dark:fill-zinc-600"
                              >
                                {it.month_name}
                              </text>
                              <text
                                x={cx}
                                y={cy - 16}
                                textAnchor="middle"
                                className={`text-[11px] font-black font-mono ${
                                  isNegative ? "fill-rose-400 dark:fill-rose-600" : "fill-emerald-400 dark:fill-emerald-600"
                                }`}
                              >
                                {hideValues ? "R$ ••••••" : formatCurrency(it.accumulated_balance_cents)}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          </div>

          {/* TABELA ANALÍTICA MÊS A MÊS */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Detalhamento Analítico Mês a Mês ({horizonMonths} Meses)
                </h3>
                <p className="text-xs text-zinc-400">
                  Composição das receitas, despesas por natureza e saldo final de cada competência
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/75 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Mês</th>
                    <th className="py-3 px-4">Saldo Inicial</th>
                    <th className="py-3 px-4 text-emerald-600 dark:text-emerald-400">Receitas Previstas</th>
                    <th className="py-3 px-4 text-rose-600 dark:text-rose-400">Despesas Previstas</th>
                    <th className="py-3 px-4 text-zinc-500">Breakdown (Obrig. / Nec. / Desejo / Cartão)</th>
                    <th className="py-3 px-4">Resultado Mês</th>
                    <th className="py-3 px-4 font-bold">Saldo Acumulado</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-mono">
                  {projection.items.map((item) => (
                    <tr 
                      key={item.month}
                      className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors ${
                        item.is_negative_alert ? "bg-rose-50/30 dark:bg-rose-950/10" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                        {item.month_name}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">
                        {hideValues ? "R$ ••••••" : formatCurrency(item.starting_balance_cents)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        +{hideValues ? "R$ ••••••" : formatCurrency(item.projected_income_cents)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-rose-600 dark:text-rose-400">
                        -{hideValues ? "R$ ••••••" : formatCurrency(item.projected_expense_cents)}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-zinc-500 font-sans">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-mono text-[10px]" title="Obrigatórias">
                            Obr: {hideValues ? "•••" : formatCurrency(item.expense_mandatory_cents)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-mono text-[10px]" title="Necessárias">
                            Nec: {hideValues ? "•••" : formatCurrency(item.expense_necessary_cents)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-mono text-[10px]" title="Desejos/Supérfluos">
                            Des: {hideValues ? "•••" : formatCurrency(item.expense_discretionary_cents)}
                          </span>
                          {item.credit_card_invoices_cents > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-mono text-[10px]" title="Faturas de Cartão">
                              💳 {hideValues ? "•••" : formatCurrency(item.credit_card_invoices_cents)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-3.5 px-4 font-bold ${
                        item.net_balance_cents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}>
                        {item.net_balance_cents >= 0 ? "+" : ""}
                        {hideValues ? "R$ ••••••" : formatCurrency(item.net_balance_cents)}
                      </td>
                      <td className={`py-3.5 px-4 font-black text-sm ${
                        item.accumulated_balance_cents < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100"
                      }`}>
                        {hideValues ? "R$ ••••••" : formatCurrency(item.accumulated_balance_cents)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.is_negative_alert ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-sans">
                            <AlertTriangle className="w-3 h-3" /> Déficit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-sans">
                            <CheckCircle2 className="w-3 h-3" /> Positivo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* ABA 2: SIMULADOR DE CENÁRIOS ("WHAT-IF")     */}
      {/* ========================================== */}
      {activeTab === "CENARIOS" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          
          {/* COLUNA ESQUERDA: CONTROLES & SLIDERS (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  <span>Parâmetros de Simulação</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Ajuste as variáveis para ver instantaneamente a curva simulada
                </p>
              </div>

              {/* Presets Rápidos */}
              <div>
                <label className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider block mb-2">
                  Presets Rápidos
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => applyPreset(0, 0, 0)}
                    className="p-2 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
                  >
                    🔄 Cenário Base (0%)
                  </button>
                  <button
                    onClick={() => applyPreset(15, 0, 0)}
                    className="p-2 text-left rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer"
                  >
                    🚀 Otimista (+15% Rec.)
                  </button>
                  <button
                    onClick={() => applyPreset(-20, 30, 0)}
                    className="p-2 text-left rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 text-xs font-semibold text-amber-600 dark:text-amber-400 transition-all cursor-pointer"
                  >
                    🛡️ Prudente (-20% Rec / -30% Des)
                  </button>
                  <button
                    onClick={() => applyPreset(0, 70, 20)}
                    className="p-2 text-left rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 text-xs font-semibold text-purple-600 dark:text-purple-400 transition-all cursor-pointer"
                  >
                    ✂️ Corte Radical (-70% Desejos)
                  </button>
                </div>
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-4">
                
                {/* 1. Variação de Receitas */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-zinc-700 dark:text-zinc-300">Variação de Receitas</span>
                    <span className={`font-mono font-bold ${
                      simIncomeVar > 0 ? "text-emerald-500" : simIncomeVar < 0 ? "text-rose-500" : "text-zinc-500"
                    }`}>
                      {simIncomeVar > 0 ? `+${simIncomeVar}%` : `${simIncomeVar}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="5"
                    value={simIncomeVar}
                    onChange={(e) => setSimIncomeVar(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>-50%</span>
                    <span>0% (Atual)</span>
                    <span>+50%</span>
                  </div>
                </div>

                {/* 2. Corte de Despesas de Desejo / Supérfluos */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-zinc-700 dark:text-zinc-300">Corte em Gastos de Desejos / Lazer</span>
                    <span className="font-mono font-bold text-purple-500">{simDiscretionaryCut}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={simDiscretionaryCut}
                    onChange={(e) => setSimDiscretionaryCut(parseInt(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* 3. Corte em Gastos Necessários */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-zinc-700 dark:text-zinc-300">Otimização em Gastos Necessários</span>
                    <span className="font-mono font-bold text-amber-500">{simNecessaryCut}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={simNecessaryCut}
                    onChange={(e) => setSimNecessaryCut(parseInt(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* 4. Nova Despesa Fixa Mensal Adicional */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nova Despesa Fixa / Parcela Mensal (R$)
                  </label>
                  <input
                    type="text"
                    value={simExtraExpenseStr}
                    onChange={(e) => setSimExtraExpenseStr(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* 5. Nova Renda Fixa Mensal Adicional */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nova Renda Fixa / Extra Mensal (R$)
                  </label>
                  <input
                    type="text"
                    value={simExtraIncomeStr}
                    onChange={(e) => setSimExtraIncomeStr(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: RESULTADOS DA SIMULAÇÃO (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            {simulationResult && (
              <>
                {/* CARDS COMPARATIVOS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <span className="text-[11px] font-semibold text-zinc-400">Saldo Final Base</span>
                    <p className="text-base font-black text-zinc-700 dark:text-zinc-300 mt-1 font-mono">
                      {hideValues ? "R$ ••••••" : formatCurrency(simulationResult.base_final_balance_cents)}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">Sem alterações</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Saldo Final Simulado</span>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                      {hideValues ? "R$ ••••••" : formatCurrency(simulationResult.simulated_final_balance_cents)}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">Com parâmetros aplicados</span>
                  </div>

                  <div className={`p-4 rounded-2xl border shadow-sm ${
                    simulationResult.total_delta_cents >= 0
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50"
                      : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50"
                  }`}>
                    <span className={`text-[11px] font-semibold ${
                      simulationResult.total_delta_cents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}>
                      Diferença Gerada (Delta)
                    </span>
                    <p className={`text-base font-black mt-1 font-mono ${
                      simulationResult.total_delta_cents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}>
                      {simulationResult.total_delta_cents >= 0 ? "+" : ""}
                      {hideValues ? "R$ ••••••" : formatCurrency(simulationResult.total_delta_cents)}
                    </p>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      {simulationResult.total_delta_cents >= 0 ? "🎉 Ganho acumulado" : "⚠️ Redução no caixa"}
                    </span>
                  </div>
                </div>

                {/* GRÁFICO COMPARATIVO DUAS CURVAS */}
                <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Comparativo: Cenário Base vs. Cenário Simulado
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Curva cinza (Base) vs. Curva verde (Simulado)
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 bg-zinc-400 inline-block"></span>
                        <span className="text-zinc-400">Base</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 bg-emerald-500 inline-block"></span>
                        <span className="text-emerald-500 font-bold">Simulado</span>
                      </div>
                    </div>
                  </div>

                  {/* SVG Gráfico de Duas Linhas */}
                  <div className="w-full h-56 relative pt-4 pb-2">
                    {(() => {
                      const items = simulationResult.items;
                      if (!items || items.length === 0) return null;

                      const allVals = [
                        ...items.map(it => it.base_accumulated_cents),
                        ...items.map(it => it.simulated_accumulated_cents)
                      ];
                      const minVal = Math.min(0, ...allVals);
                      const maxVal = Math.max(100000, ...allVals);
                      const range = maxVal - minVal || 1;

                      const svgWidth = 800;
                      const svgHeight = 180;
                      const paddingX = 30;
                      const paddingY = 20;

                      const getX = (idx: number) => paddingX + (idx / (items.length - 1 || 1)) * (svgWidth - 2 * paddingX);
                      const getY = (val: number) => svgHeight - paddingY - ((val - minVal) / range) * (svgHeight - 2 * paddingY);

                      const basePoints = items.map((it, idx) => `${getX(idx)},${getY(it.base_accumulated_cents)}`).join(" ");
                      const simPoints = items.map((it, idx) => `${getX(idx)},${getY(it.simulated_accumulated_cents)}`).join(" ");

                      return (
                        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                          {/* Linha Zero */}
                          <line
                            x1={paddingX}
                            y1={getY(0)}
                            x2={svgWidth - paddingX}
                            y2={getY(0)}
                            stroke="currentColor"
                            className="text-zinc-200 dark:text-zinc-800"
                            strokeDasharray="4 4"
                          />

                          {/* Linha Base */}
                          <polyline
                            fill="none"
                            stroke="#71717a"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                            points={basePoints}
                          />

                          {/* Linha Simulada */}
                          <polyline
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={simPoints}
                          />

                          {/* Pontos da Linha Simulada */}
                          {items.map((it, idx) => (
                            <circle
                              key={it.month}
                              cx={getX(idx)}
                              cy={getY(it.simulated_accumulated_cents)}
                              r="3.5"
                              className="fill-emerald-500 stroke-white dark:stroke-zinc-900"
                              strokeWidth="1.5"
                            />
                          ))}
                        </svg>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* ABA 3: RUNWAY, FÔLEGO & RESERVA             */}
      {/* ========================================== */}
      {activeTab === "RUNWAY" && runway && (
        <div className="space-y-6">
          
          {/* TERMÔMETRO VISUAL DE FÔLEGO */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>Fôlego Financeiro & Runway ({runway.runway_months} Meses)</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  {profile === "PESSOAL" 
                    ? "Quantos meses você sobrevive mantendo apenas suas despesas essenciais (Reserva de Emergência)"
                    : "Quantos meses a empresa sobrevive com o caixa atual sem novas receitas (Burn Rate)"}
                </p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide ${
                runway.health_status === "EXCELENTE" ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" :
                runway.health_status === "BOM" ? "bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400" :
                runway.health_status === "MODERADO" ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400" :
                "bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
              }`}>
                SAÚDE: {runway.health_status}
              </span>
            </div>

            {/* Barra Termômetro */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                <div className="w-1/4 bg-rose-500/80 border-r border-white/20" title="Crítico (< 3m)"></div>
                <div className="w-1/4 bg-amber-500/80 border-r border-white/20" title="Moderado (3 a 6m)"></div>
                <div className="w-1/4 bg-teal-500/80 border-r border-white/20" title="Bom (6 a 12m)"></div>
                <div className="w-1/4 bg-emerald-500/80" title="Excelente (> 12m)"></div>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                <span>0m (Crítico)</span>
                <span>3m (Mínimo)</span>
                <span>6m (Ideal PF)</span>
                <span>12m+ (Independência)</span>
              </div>
            </div>
          </div>

          {/* CARDS DE DETALHAMENTO DO RUNWAY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <span className="text-[11px] font-semibold text-zinc-400">Saldo Líquido em Caixa</span>
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
                {hideValues ? "R$ ••••••" : formatCurrency(runway.current_liquid_balance_cents)}
              </p>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Disponível em contas</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <span className="text-[11px] font-semibold text-rose-500">Custo Essencial Mensal</span>
              <p className="text-lg font-black text-rose-500 mt-1 font-mono">
                {hideValues ? "R$ ••••••" : formatCurrency(runway.essential_monthly_cost_cents)}
              </p>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Obrigatório + Necessário</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <span className="text-[11px] font-semibold text-emerald-500">Reserva Recomendada</span>
              <p className="text-lg font-black text-emerald-500 mt-1 font-mono">
                {hideValues ? "R$ ••••••" : formatCurrency(runway.recommended_reserve_cents)}
              </p>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                {profile === "PESSOAL" ? "Meta de 6 meses" : "Meta de 3 meses de despesas"}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <span className="text-[11px] font-semibold text-purple-500">
                {profile === "PESSOAL" ? "Número FIRE (4%)" : "Burn Rate Mensal"}
              </span>
              <p className="text-lg font-black text-purple-500 mt-1 font-mono">
                {hideValues ? "R$ ••••••" : formatCurrency(
                  profile === "PESSOAL" ? (runway.fire_number_cents || 0) : (runway.burn_rate_cents || 0)
                )}
              </p>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                {profile === "PESSOAL" ? "25x Custo de vida anual" : "Custo total médio de queima"}
              </span>
            </div>

          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* ABA 4: METAS COM PROJEÇÃO TEMPORAL         */}
      {/* ========================================== */}
      {activeTab === "METAS" && goalsProj && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <span className="text-[11px] font-semibold text-zinc-400">Total Alvo em Metas</span>
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 mt-1 font-mono">
                {hideValues ? "R$ ••••••" : formatCurrency(goalsProj.total_target_cents)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <span className="text-[11px] font-semibold text-emerald-500">Total Já Poupado</span>
              <p className="text-lg font-black text-emerald-500 mt-1 font-mono">
                {hideValues ? "R$ ••••••" : formatCurrency(goalsProj.total_current_cents)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <span className="text-[11px] font-semibold text-purple-500">Restante para Concluir</span>
              <p className="text-lg font-black text-purple-500 mt-1 font-mono">
                {hideValues ? "R$ ••••••" : formatCurrency(goalsProj.total_remaining_cents)}
              </p>
            </div>
          </div>

          {/* LISTA DE METAS COM PROJEÇÃO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {goalsProj.goals.map((g) => (
              <div 
                key={g.id}
                className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{g.title}</h4>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Alvo: {hideValues ? "R$ ••••••" : formatCurrency(g.target_amount_cents)}
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg">
                    {g.progress_percentage}%
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, g.progress_percentage)}%` }}
                  />
                </div>

                {/* Projeções Matemáticas */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Previsão de Conclusão</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                      {g.estimated_completion_date || "Sem histórico suficiente"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Aporte Mensal Recomendado</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                      {g.required_monthly_deposit_cents 
                        ? (hideValues ? "R$ ••••••" : formatCurrency(g.required_monthly_deposit_cents)) 
                        : "Defina data alvo"}
                    </span>
                  </div>
                  {g.compound_interest_gain_cents ? (
                    <div className="col-span-2 mt-1 p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Juros estimados em 1 ano (100% CDI): <strong>+{formatCurrency(g.compound_interest_gain_cents)}</strong>
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* ABA 5: MAPA DE COMPROMETIMENTO DE RENDA    */}
      {/* ========================================== */}
      {activeTab === "COMPROMETIMENTO" && committed && (
        <div className="space-y-6">
          
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-indigo-500" />
                  <span>Comprometimento Médio de Renda Futura ({committed.average_committed_percentage}%)</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Percentual da receita esperada que já está consumido por contratos, parcelas de cartão e dívidas
                </p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                committed.average_committed_percentage <= 50 
                  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600" 
                  : committed.average_committed_percentage <= 75
                  ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600"
                  : "bg-rose-100 dark:bg-rose-950/50 text-rose-600"
              }`}>
                {committed.average_committed_percentage <= 50 ? "✓ Liberdade Saudável" : "⚠️ Renda Comprometida"}
              </span>
            </div>

            {/* Grid Mês a Mês */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2">
              {committed.items.map((item) => (
                <div 
                  key={item.month}
                  className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 space-y-2"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.month_name}</span>
                    <span className="font-mono font-black text-[11px] text-indigo-600 dark:text-indigo-400">
                      {item.committed_percentage}%
                    </span>
                  </div>

                  {/* Barra empilhada */}
                  <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        item.committed_percentage > 70 ? "bg-rose-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${Math.min(100, item.committed_percentage)}%` }}
                    />
                  </div>

                  <div className="text-[10px] text-zinc-400 font-mono flex justify-between">
                    <span>Livre: {hideValues ? "•••" : formatCurrency(item.free_income_cents)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
