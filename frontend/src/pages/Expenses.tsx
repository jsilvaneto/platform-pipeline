import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet,
  Search,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { walletApi } from "../api/walletApi";
import {
  WalletAccount,
  WalletRecord,
  Category,
} from "../types";
import { formatCurrency } from "../utils/format";

interface ExpensesProps {
  isCreateModalOpenExternal?: boolean;
  onCloseCreateModalExternal?: () => void;
}

export const Expenses: React.FC<ExpensesProps> = () => {
  const today = useMemo(() => new Date(), []);
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedAccount, setSelectedAccount] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL"); // ALL, RECEITA, DESPESA, TRANSFERENCIA
  const [selectedState, setSelectedState] = useState<string>("ALL"); // ALL, reconciled, cleared, uncleared
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Dados
  const [records, setRecords] = useState<WalletRecord[]>([]);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Carrega contas e categorias uma vez
  const loadAuxData = useCallback(async () => {
    try {
      const [accs, cats] = await Promise.all([
        walletApi.getAccounts(),
        walletApi.getCategories(),
      ]);
      setAccounts(accs);
      setCategories(cats);
    } catch {
      // Ignora erro auxiliar se o backend ainda estiver sem dados
    }
  }, []);

  useEffect(() => {
    loadAuxData();
  }, [loadAuxData]);

  // Carrega transações filtradas
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        page_size: pageSize,
      };

      if (selectedMonth && selectedMonth !== "ALL") {
        params.month = selectedMonth;
      }
      if (selectedAccount !== "ALL") {
        params.account_id = selectedAccount;
      }
      if (selectedCategory !== "ALL") {
        params.category_id = selectedCategory;
      }
      if (selectedType !== "ALL") {
        params.record_type = selectedType;
      }
      if (selectedState !== "ALL") {
        params.record_state = selectedState;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await walletApi.getRecords(params);
      setRecords(res.items);
      setTotalRecords(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error("Erro ao carregar transações:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    selectedMonth,
    selectedAccount,
    selectedCategory,
    selectedType,
    selectedState,
    searchQuery,
  ]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Controles de Mês
  const handlePrevMonth = () => {
    if (selectedMonth === "ALL") return;
    const [y, m] = selectedMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
    setCurrentPage(1);
  };

  const handleNextMonth = () => {
    if (selectedMonth === "ALL") return;
    const [y, m] = selectedMonth.split("-").map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
    setCurrentPage(1);
  };

  const formattedMonthLabel = useMemo(() => {
    if (selectedMonth === "ALL") return "Todo o Histórico";
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Transações Financeiras (Extrato Geral)
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Lançamentos consolidados e sincronizados da API oficial do Wallet
          </p>
        </div>

        {/* Seletor de Mês */}
        <div className="flex items-center space-x-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 shadow-xs">
          <button
            onClick={handlePrevMonth}
            disabled={selectedMonth === "ALL"}
            className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 min-w-[130px] text-center capitalize">
            {formattedMonthLabel}
          </span>
          <button
            onClick={handleNextMonth}
            disabled={selectedMonth === "ALL"}
            className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedMonth(selectedMonth === "ALL" ? currentMonthStr : "ALL");
              setCurrentPage(1);
            }}
            className="text-[11px] px-2 py-1 rounded-lg font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition-colors cursor-pointer ml-1"
          >
            {selectedMonth === "ALL" ? "Ver Mês Atual" : "Ver Todos"}
          </button>
        </div>
      </div>

      {/* Fita de Contas e Saldos */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => {
                setSelectedAccount(selectedAccount === acc.id ? "ALL" : acc.id);
                setCurrentPage(1);
              }}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedAccount === acc.id
                  ? "bg-blue-50/80 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 shadow-xs"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: acc.color || "#2563eb" }}
                />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {acc.name}
                </span>
              </div>
              <div
                className={`text-sm font-bold font-mono ${
                  acc.current_balance_cents < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {formatCurrency(acc.current_balance_cents)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Busca Textual */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por estabelecimento, pessoa ou anotação..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro por Categoria */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Conciliação */}
          <div>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Todos os Estados</option>
              <option value="reconciled">Verificado no Extrato (Reconciled)</option>
              <option value="cleared">Processado pelo Banco (Cleared)</option>
              <option value="uncleared">Pendente (Uncleared)</option>
            </select>
          </div>
        </div>

        {/* Filtros de Tipo Rápido */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
          <span className="text-xs text-zinc-500 mr-2">Natureza:</span>
          {[
            { id: "ALL", label: "Todas" },
            { id: "DESPESA", label: "Despesas" },
            { id: "RECEITA", label: "Receitas" },
            { id: "TRANSFERENCIA", label: "Transferências" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedType(t.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                selectedType === t.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20 px-4">
            <Wallet className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
              Nenhuma transação encontrada
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Nenhum registro corresponde aos filtros selecionados ou ainda não houve sincronização.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Descrição / Estabelecimento</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Conta</th>
                  <th className="py-3.5 px-4">Conciliação</th>
                  <th className="py-3.5 px-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {records.map((rec) => {
                  const isExpense = rec.record_type === "DESPESA";
                  const isIncome = rec.record_type === "RECEITA";
                  const isReconciled = rec.record_state === "reconciled";

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      {/* Data */}
                      <td className="py-3.5 px-4 font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {rec.record_date.slice(0, 10)}
                      </td>

                      {/* Descrição & Estabelecimento */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {rec.counter_party || rec.note || "Lançamento"}
                        </div>
                        {rec.note && rec.counter_party && (
                          <div className="text-[11px] text-zinc-500 truncate max-w-xs mt-0.5">
                            {rec.note}
                          </div>
                        )}
                        {rec.labels && rec.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rec.labels.map((lbl) => (
                              <span
                                key={lbl}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono"
                              >
                                #{lbl}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4">
                        {rec.category_name ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: rec.category_color || "#6366f1" }}
                            />
                            <span>{rec.category_name}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[11px] italic">Sem categoria</span>
                        )}
                      </td>

                      {/* Conta */}
                      <td className="py-3.5 px-4 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {rec.account_name}
                      </td>

                      {/* Conciliação */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isReconciled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3" />
                            Verificado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            <Clock className="w-3 h-3" />
                            {rec.record_state === "cleared" ? "Compensado" : "Pendente"}
                          </span>
                        )}
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isExpense
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-blue-600 dark:text-blue-400"
                          }
                        >
                          {isIncome ? "+" : isExpense ? "-" : ""}
                          {formatCurrency(rec.amount_cents)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé de Paginação */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Mostrando <strong>{records.length}</strong> de <strong>{totalRecords}</strong> transações
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
