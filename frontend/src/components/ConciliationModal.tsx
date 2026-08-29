import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { 
  Account, Category, Contact, PaymentMethod,
  ConciliationParsedItem, ConciliationParseResponse
} from "../types";
import { formatCurrency } from "../utils/format";
import { 
  X, Upload, FileSpreadsheet, Check, AlertCircle, 
  CheckCircle2, ArrowUpRight, ArrowDownRight, Loader2,
  Building2, Landmark, HelpCircle, ShieldAlert, Sparkles, Filter
} from "lucide-react";

interface ConciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  categories: Category[];
  contacts: Contact[];
  paymentMethods: PaymentMethod[];
}

export const ConciliationModal: React.FC<ConciliationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  contacts,
  paymentMethods,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado do Passo 2 (Conferência)
  const [parsedData, setParsedData] = useState<ConciliationParseResponse | null>(null);
  const [items, setItems] = useState<ConciliationParsedItem[]>([]);
  const [filterMatch, setFilterMatch] = useState<string>("TODOS");
  const [importing, setImporting] = useState(false);

  // Filtra apenas contas do perfil EMPRESA
  const empresaAccounts = accounts.filter(a => a.profile === "EMPRESA");

  useEffect(() => {
    if (empresaAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(empresaAccounts[0].id);
    }
  }, [empresaAccounts, selectedAccountId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleProcessFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedAccountId) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("account_id", selectedAccountId);
      formData.append("profile", "EMPRESA");
      formData.append("file", file);

      const res = await api.post<ConciliationParseResponse>("/conciliation/parse", formData);
      setParsedData(res.data);
      
      // Inicializa os campos customizados com as sugestões automáticas
      const enriched = res.data.items.map(it => ({
        ...it,
        custom_category_id: it.suggested_category_id || "",
        custom_contact_id: it.suggested_contact_id || "",
        custom_payment_method_id: it.suggested_payment_method_id || "",
        custom_description: it.description,
      }));
      setItems(enriched);
    } catch (err: any) {
      console.error("Erro ao processar extrato:", err);
      setError(err.response?.data?.detail || "Erro ao processar arquivo de extrato.");
    } finally {
      setUploading(false);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setItems(prev => prev.map(it => ({ ...it, selected: checked })));
  };

  const toggleSelectItem = (id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, selected: !it.selected } : it));
  };

  const updateItemField = (id: string, field: keyof ConciliationParsedItem, value: any) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const filteredItems = items.filter(it => {
    if (filterMatch === "TODOS") return true;
    return it.match_status === filterMatch;
  });

  const selectedCount = items.filter(it => it.selected).length;
  const selectedSumCents = items
    .filter(it => it.selected)
    .reduce((acc, it) => acc + (it.type === "RECEITA" ? it.amount_cents : -it.amount_cents), 0);

  const handleConfirmImport = async () => {
    const selectedItems = items.filter(it => it.selected);
    if (selectedItems.length === 0) {
      alert("Selecione ao menos um lançamento para importar.");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      await api.post("/conciliation/import", {
        account_id: selectedAccountId,
        profile: "EMPRESA",
        items: selectedItems.map(it => ({
          date: it.date,
          description: it.custom_description?.trim() || it.description,
          amount_cents: it.amount_cents,
          type: it.type,
          category_id: it.custom_category_id || undefined,
          contact_id: it.custom_contact_id || undefined,
          payment_method_id: it.custom_payment_method_id || undefined,
          status: "CONCLUIDO",
        }))
      });

      alert(`Sucesso! ${selectedItems.length} transações importadas e conciliadas.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Erro ao importar lançamentos:", err);
      setError(err.response?.data?.detail || "Erro ao salvar transações conciliadas.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Importador & Conciliação Bancária
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Exclusivo EMPRESA (PJ)
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Upload de extratos OFX/CSV, auto-categorização inteligente e prevenção de duplicidades.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Rolagem */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* PASSO 1: UPLOAD DO ARQUIVO */}
          {!parsedData ? (
            <form onSubmit={handleProcessFile} className="space-y-6 max-w-xl mx-auto py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    1. Selecione a Conta Bancária de Destino
                  </label>
                  <select
                    required
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                  >
                    {empresaAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    2. Selecione o Arquivo de Extrato (.OFX ou .CSV)
                  </label>
                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 text-center hover:border-indigo-500 transition-all bg-zinc-50/50 dark:bg-zinc-800/20">
                    <input
                      type="file"
                      id="ofx-file-input"
                      accept=".ofx,.csv,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="ofx-file-input" className="cursor-pointer space-y-3 block">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {file ? file.name : "Clique para selecionar o arquivo de extrato"}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Suporte a qualquer banco brasileiro (Itaú, Inter, Bradesco, Nubank PJ, BB, Santander, etc.)
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!file || uploading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Lendo e Cruzando Dados do Extrato...</span>
                  </>
                ) : (
                  <span>Processar e Analisar Extrato</span>
                )}
              </button>
            </form>
          ) : (
            /* PASSO 2: TABELA DE CONCILIAÇÃO E CONFERÊNCIA */
            <div className="space-y-5">
              {/* KPIs do Extrato Processado */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total Extraído</span>
                  <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {parsedData.total_parsed} transações
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3.5">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Novos Lançamentos</span>
                  <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {parsedData.new_count}
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Possíveis Duplicados</span>
                  <div className="text-lg font-bold font-mono text-zinc-500">
                    {parsedData.duplicate_count}
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3.5">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Selecionados p/ Gravar</span>
                  <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {selectedCount} de {items.length}
                  </div>
                </div>
              </div>

              {/* Filtros e Controles Rápidos */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/60 dark:bg-zinc-800/20 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && items.every(it => it.selected)}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300"
                    />
                    <span>Selecionar Todos</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setParsedData(null);
                      setFile(null);
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Trocar Arquivo
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Filtrar por Status:</span>
                  <select
                    value={filterMatch}
                    onChange={(e) => setFilterMatch(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="TODOS">Todos ({items.length})</option>
                    <option value="NOVO">Novos ({parsedData.new_count})</option>
                    <option value="DUPLICADO">Duplicados ({parsedData.duplicate_count})</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Conferência */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-400 uppercase font-mono text-[10px] sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="p-3 w-10 text-center">✓</th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Descrição / Histórico</th>
                        <th className="p-3">Valor</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Categoria Sugerida</th>
                        <th className="p-3">Favorecido / Contato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {filteredItems.map((item) => {
                        const isDup = item.match_status === "DUPLICADO";
                        const isIncome = item.type === "RECEITA";

                        return (
                          <tr 
                            key={item.id} 
                            className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors ${
                              isDup ? "opacity-60 bg-zinc-50/30 dark:bg-zinc-900/30" : ""
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => toggleSelectItem(item.id)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-mono font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                              {item.date}
                            </td>
                            <td className="p-3 min-w-[200px]">
                              <input
                                type="text"
                                value={item.custom_description || item.description}
                                onChange={(e) => updateItemField(item.id, "custom_description", e.target.value)}
                                className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 rounded text-xs text-zinc-900 dark:text-zinc-100 font-medium"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold whitespace-nowrap">
                              <span className={isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                {isIncome ? "+" : "-"} {formatCurrency(item.amount_cents)}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                isDup
                                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              }`}>
                                {isDup ? "⚠️ DUPLICADO" : "✓ NOVO"}
                              </span>
                            </td>
                            <td className="p-3 min-w-[160px]">
                              <select
                                value={item.custom_category_id || ""}
                                onChange={(e) => updateItemField(item.id, "custom_category_id", e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-medium"
                              >
                                <option value="">Sem categoria</option>
                                {categories
                                  .filter(c => c.profile === "EMPRESA" && (c.type === item.type))
                                  .map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                              </select>
                            </td>
                            <td className="p-3 min-w-[160px]">
                              <select
                                value={item.custom_contact_id || ""}
                                onChange={(e) => updateItemField(item.id, "custom_contact_id", e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-medium"
                              >
                                <option value="">Nenhum contato</option>
                                {contacts
                                  .filter(c => c.profile === "EMPRESA")
                                  .map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé de Ações */}
        {parsedData && (
          <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0">
            <div className="text-xs text-zinc-500">
              <span>Selecionados: <strong className="text-zinc-900 dark:text-zinc-100">{selectedCount}</strong> lançamentos</span>
              <span className="mx-2">•</span>
              <span>Impacto Líquido: <strong className={`font-mono ${selectedSumCents >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(Math.abs(selectedSumCents))} ({selectedSumCents >= 0 ? "Crédito" : "Débito"})
              </strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedCount === 0 || importing}
                className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gravando Lançamentos...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar Importação de {selectedCount} Itens</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
