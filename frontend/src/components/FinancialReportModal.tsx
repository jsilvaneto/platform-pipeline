import React from "react";
import { Transaction, Category, Contact, Account, PaymentMethod, ProfileType } from "../types";
import { formatCurrency, formatDateToBR } from "../utils/format";
import { 
  X, Printer, FileDown, ArrowUpRight, ArrowDownRight, 
  ArrowRightLeft, Landmark, CreditCard, Tag, User as ContactIcon, CheckCircle2, Clock
} from "lucide-react";

interface FinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfileType;
  periodTitle: string;
  transactions: Transaction[];
  categories: Record<string, Category>;
  accounts: Record<string, Account>;
  paymentMethods: Record<string, PaymentMethod>;
  contacts: Record<string, Contact>;
}

export const FinancialReportModal: React.FC<FinancialReportModalProps> = ({
  isOpen,
  onClose,
  profile,
  periodTitle,
  transactions,
  categories,
  accounts,
  paymentMethods,
  contacts,
}) => {
  if (!isOpen) return null;

  // Métricas Consolidadas
  let totalIncomeCents = 0;
  let totalExpenseCents = 0;
  let totalTransfersCents = 0;
  let pendingCount = 0;
  let completedCount = 0;

  const categoryTotals: Record<string, { name: string; type: string; totalCents: number; count: number }> = {};

  transactions.forEach((t) => {
    if (t.status === "CONCLUIDO") {
      completedCount++;
    } else {
      pendingCount++;
    }

    if (t.type === "RECEITA") {
      totalIncomeCents += t.amount_cents;
    } else if (t.type === "DESPESA") {
      totalExpenseCents += t.amount_cents;
    } else if (t.type === "TRANSFERENCIA") {
      totalTransfersCents += t.amount_cents;
    }

    if (t.category_id && categories[t.category_id]) {
      const cat = categories[t.category_id];
      if (!categoryTotals[t.category_id]) {
        categoryTotals[t.category_id] = { name: cat.name, type: cat.type, totalCents: 0, count: 0 };
      }
      categoryTotals[t.category_id].totalCents += t.amount_cents;
      categoryTotals[t.category_id].count += 1;
    }
  });

  const netBalanceCents = totalIncomeCents - totalExpenseCents;
  const sortedCategories = Object.values(categoryTotals).sort((a, b) => b.totalCents - a.totalCents);

  // Impressão / Salvar PDF
  const handlePrint = () => {
    window.print();
  };

  // Exportação CSV
  const handleExportCSV = () => {
    const headers = [
      "ID", "Data_Vencimento", "Data_Pagamento", "Status", "Tipo", "Descricao",
      "Categoria", "Conta_Origem", "Conta_Destino", "Forma_Pagamento", "Contato", "Valor_R$"
    ];

    const rows = transactions.map((t) => {
      const catName = t.category_id ? categories[t.category_id]?.name || "" : (t.type === "TRANSFERENCIA" ? "Transferência Interna" : "");
      const srcAcc = t.account_id ? accounts[t.account_id]?.name || "" : "";
      const dstAcc = t.destination_account_id ? accounts[t.destination_account_id]?.name || "" : "";
      const pmName = t.payment_method_id ? paymentMethods[t.payment_method_id]?.name || "" : "";
      const conName = t.contact_id ? contacts[t.contact_id]?.name || "" : "";
      const valStr = (t.amount_cents / 100).toFixed(2).replace(".", ",");

      return [
        t.id,
        t.due_date,
        t.payment_date || "",
        t.status,
        t.type,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${catName}"`,
        `"${srcAcc}"`,
        `"${dstAcc}"`,
        `"${pmName}"`,
        `"${conName}"`,
        valStr
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-financeiro-${profile.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generationTimestamp = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:static">
      {/* Estilos específicos de impressão para PDF em folha A4 limpa */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-financial-report, #printable-financial-report * {
            visibility: visible;
          }
          #printable-financial-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: #ffffff !important;
            color: #111827 !important;
            font-size: 11px;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:w-full">
        
        {/* Header da Barra de Ações (Oculto na impressão) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                Relatório Financeiro Executivo
              </h2>
              <p className="text-[11px] text-zinc-400">
                Visualização consolidada com exportação em PDF e planilha CSV
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Baixar planilha compatível com Excel / LibreOffice"
            >
              <FileDown className="w-4 h-4 text-zinc-500" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              title="Abrir diálogo de impressão / Salvar como PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-xl transition-all ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Imprimível do Relatório */}
        <div id="printable-financial-report" className="p-6 sm:p-8 overflow-y-auto space-y-6 text-zinc-800 dark:text-zinc-200 print:p-0 print:overflow-visible">
          
          {/* Cabeçalho do Relatório */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                  WALLET
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 uppercase">
                  {profile}
                </span>
              </div>
              <h1 className="text-base font-bold text-zinc-700 dark:text-zinc-300 mt-1">
                Extrato Consolidado de Movimentações Financeiras
              </h1>
              <p className="text-xs text-zinc-500">
                Período: <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{periodTitle}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right text-xs text-zinc-400 space-y-0.5">
              <p>Emissão: <strong className="text-zinc-700 dark:text-zinc-300">{generationTimestamp}</strong></p>
              <p>Total de Registros: <strong className="text-zinc-700 dark:text-zinc-300">{transactions.length}</strong> ({completedCount} liquidados, {pendingCount} pendentes)</p>
            </div>
          </div>

          {/* Cards de Resumo Financeiro (KPIs) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase tracking-wider">
                Total Receitas
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5">
                {formatCurrency(totalIncomeCents)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block uppercase tracking-wider">
                Total Despesas
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400 block mt-0.5">
                {formatCurrency(totalExpenseCents)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block uppercase tracking-wider">
                Resultado Líquido
              </span>
              <span className={`text-base sm:text-lg font-black font-mono block mt-0.5 ${
                netBalanceCents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}>
                {netBalanceCents >= 0 ? "+" : ""}{formatCurrency(netBalanceCents)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 block uppercase tracking-wider">
                Transferências Internas
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 block mt-0.5">
                {formatCurrency(totalTransfersCents)}
              </span>
            </div>
          </div>

          {/* Resumo por Categorias (se houver) */}
          {sortedCategories.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Distribuição por Categoria
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {sortedCategories.slice(0, 8).map((cat) => (
                  <div key={cat.name} className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/20 flex items-center justify-between gap-2 text-xs">
                    <div className="truncate">
                      <span className="font-semibold block truncate">{cat.name}</span>
                      <span className="text-[10px] text-zinc-400">{cat.count} lançamento(s)</span>
                    </div>
                    <span className="font-mono font-bold shrink-0">
                      {formatCurrency(cat.totalCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela Detalhada de Lançamentos */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Detalhamento de Lançamentos
            </h3>
            
            {transactions.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">Nenhum lançamento no período filtrado.</p>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                      <th className="py-2.5 px-3">Data Venc.</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Conta / Meio</th>
                      <th className="py-2.5 px-3">Contato</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[11px]">
                    {transactions.map((t) => {
                      const isCompleted = t.status === "CONCLUIDO";
                      const catName = t.category_id ? categories[t.category_id]?.name : (t.type === "TRANSFERENCIA" ? "Transferência Interna" : "-");
                      const srcAcc = t.account_id ? accounts[t.account_id]?.name : "";
                      const dstAcc = t.destination_account_id ? accounts[t.destination_account_id]?.name : "";
                      const pmName = t.payment_method_id ? paymentMethods[t.payment_method_id]?.name : "";
                      const conName = t.contact_id ? contacts[t.contact_id]?.name : "-";

                      let accountStr = "-";
                      if (t.type === "TRANSFERENCIA") {
                        accountStr = `${srcAcc || "Origem"} → ${dstAcc || "Destino"}`;
                      } else if (srcAcc) {
                        accountStr = srcAcc + (pmName ? ` (${pmName})` : "");
                      } else if (pmName) {
                        accountStr = pmName;
                      }

                      return (
                        <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="py-2 px-3 font-mono whitespace-nowrap">
                            {formatDateToBR(t.due_date)}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            }`}>
                              {isCompleted ? "Liquidado" : "Pendente"}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium">
                            {t.description}
                          </td>
                          <td className="py-2 px-3 text-zinc-500 truncate max-w-[140px]">
                            {catName}
                          </td>
                          <td className="py-2 px-3 text-zinc-500 truncate max-w-[140px]">
                            {accountStr}
                          </td>
                          <td className="py-2 px-3 text-zinc-500 truncate max-w-[120px]">
                            {conName}
                          </td>
                          <td className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            t.type === "DESPESA"
                              ? "text-rose-600 dark:text-rose-400"
                              : t.type === "RECEITA"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-indigo-600 dark:text-indigo-400"
                          }`}>
                            {t.type === "DESPESA" ? "-" : t.type === "RECEITA" ? "+" : "⇄"} {formatCurrency(t.amount_cents)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Rodapé de Encerramento */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400">
            <span>Relatório gerado automaticamente pelo Sistema Wallet</span>
            <span>Página 1 de 1</span>
          </div>

        </div>

      </div>
    </div>
  );
};
