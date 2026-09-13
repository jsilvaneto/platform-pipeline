import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Receipt,
  FileSignature,
  Paperclip,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import { Modal } from "../Modal";
import { walletApi } from "../../api/walletApi";
import { Attachment, AttachmentCategory } from "../../types";
import { formatDate } from "../../utils/format";

interface AttachmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  expenseId?: string;
  paymentId?: string;
  defaultCategory?: AttachmentCategory;
  onAttachmentCountChange?: (count: number) => void;
}

export const CATEGORY_CONFIG: Record<
  AttachmentCategory,
  { label: string; color: string; icon: React.FC<{ className?: string }> }
> = {
  COMPROVANTE_PAGAMENTO: {
    label: "Comprovante de Pagamento",
    color:
      "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: Receipt,
  },
  NOTA_FISCAL: {
    label: "Nota Fiscal / Recibo",
    color:
      "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    icon: FileCheck,
  },
  FATURA_BOLETO: {
    label: "Fatura / Boleto",
    color:
      "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: FileText,
  },
  CONTRATO: {
    label: "Contrato / Termo",
    color:
      "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: FileSignature,
  },
  OUTRO: {
    label: "Outro Documento",
    color:
      "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    icon: Paperclip,
  },
};

export const AttachmentManagerModal: React.FC<AttachmentManagerModalProps> = ({
  isOpen,
  onClose,
  title,
  expenseId,
  paymentId,
  defaultCategory = "COMPROVANTE_PAGAMENTO",
  onAttachmentCountChange,
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<AttachmentCategory>(defaultCategory);
  const [notes, setNotes] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Preview state
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  // Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAttachments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await walletApi.listAttachments({
        expense_id: expenseId,
        payment_id: paymentId,
      });
      setAttachments(res.items);
      if (onAttachmentCountChange) {
        onAttachmentCountChange(res.total);
      }
    } catch {
      setErrorMessage("Erro ao carregar lista de anexos.");
    } finally {
      setIsLoading(false);
    }
  }, [expenseId, paymentId, onAttachmentCountChange]);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setSelectedFile(null);
      setNotes("");
      setErrorMessage(null);
      setSuccessMessage(null);
      setPreviewAttachment(null);
      loadAttachments();
    }
  }, [isOpen, defaultCategory, loadAttachments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage("Arquivo excede o limite máximo de 15 MB.");
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage("Arquivo excede o limite máximo de 15 MB.");
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Selecione um arquivo para enviar.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await walletApi.uploadAttachment({
        file: selectedFile,
        category,
        expenseId,
        paymentId,
        notes: notes.trim() || undefined,
      });

      setSuccessMessage("Anexo enviado com sucesso!");
      setSelectedFile(null);
      setNotes("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadAttachments();
    } catch (err: unknown) {
      let msg = "Falha ao enviar arquivo.";
      if (typeof err === "object" && err !== null && "response" in err) {
        const resData = (err as { response?: { data?: { detail?: string } } }).response?.data;
        if (resData?.detail) {
          msg = resData.detail;
        }
      }
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm("Deseja realmente excluir este anexo? O arquivo será removido definitivamente.")) {
      return;
    }

    setDeletingId(attachmentId);
    setErrorMessage(null);
    try {
      await walletApi.deleteAttachment(attachmentId);
      setSuccessMessage("Anexo excluído com sucesso.");
      await loadAttachments();
    } catch {
      setErrorMessage("Erro ao excluir o anexo.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="lg">
        <div className="space-y-6">
          {/* Mensagens de Alerta / Sucesso */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Formulário de Envio de Anexo */}
          <form
            onSubmit={handleUpload}
            className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Novo Anexo / Documento
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Formatos: PDF, PNG, JPG, WEBP (até 15 MB)
              </span>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                  : selectedFile
                  ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center justify-center space-y-1.5">
                {selectedFile ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Clique para trocar
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                    <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
                      Arraste um arquivo ou clique para selecionar
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Salvo diretamente na pasta sincronizada do seu computador
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Controles de Categoria e Observações */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Categoria do Documento
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AttachmentCategory)}
                  className="w-full text-xs py-2 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-200"
                >
                  <option value="COMPROVANTE_PAGAMENTO">🟢 Comprovante de Pagamento</option>
                  <option value="NOTA_FISCAL">🔵 Nota Fiscal / Recibo</option>
                  <option value="FATURA_BOLETO">🟡 Fatura / Boleto</option>
                  <option value="CONTRATO">🟣 Contrato / Termo</option>
                  <option value="OUTRO">⚪ Outro Documento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Observação / Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Comprovante pago via PIX Santander"
                  className="w-full text-xs py-2 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-800 dark:text-zinc-200"
                />
              </div>
            </div>

            {/* Botão de Envio */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!selectedFile || isUploading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 transition-colors cursor-pointer shadow-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Anexar Arquivo</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Lista de Anexos Existentes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center space-x-2">
                <span>Anexos Vinculados</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px]">
                  {attachments.length}
                </span>
              </h4>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-zinc-400 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs">Carregando anexos...</span>
              </div>
            ) : attachments.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <Paperclip className="w-8 h-8 mx-auto opacity-50 mb-1" />
                <p className="text-xs font-medium">Nenhum anexo vinculado a este registro.</p>
                <p className="text-[11px]">Faça o upload acima para anexar comprovantes ou notas fiscais.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                {attachments.map((att) => {
                  const cfg = CATEGORY_CONFIG[att.category] || CATEGORY_CONFIG.OUTRO;
                  const IconComp = cfg.icon;
                  const isImage = att.content_type.startsWith("image/");
                  const isPdf = att.content_type.includes("pdf");

                  return (
                    <div
                      key={att.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${cfg.color}`}
                        >
                          {isImage ? (
                            <ImageIcon className="w-4 h-4" />
                          ) : (
                            <IconComp className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 max-w-xs truncate">
                              {att.original_filename}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}
                            >
                              {cfg.label}
                            </span>
                            {att.payment_id && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Parcela
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span>{att.file_size_pretty}</span>
                            <span>•</span>
                            <span>{formatDate(att.created_at.split("T")[0])}</span>
                            {att.notes && (
                              <>
                                <span>•</span>
                                <span className="italic text-zinc-600 dark:text-zinc-300">
                                  "{att.notes}"
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center space-x-1.5 self-end sm:self-center">
                        {(isImage || isPdf) && (
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment(att)}
                            className="p-1.5 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                            title="Visualizar anexo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        <a
                          href={walletApi.getAttachmentDownloadUrl(att.id)}
                          download={att.original_filename}
                          className="p-1.5 text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                          title="Baixar arquivo original"
                        >
                          <Download className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDelete(att.id)}
                          disabled={deletingId === att.id}
                          className="p-1.5 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                          title="Excluir anexo"
                        >
                          {deletingId === att.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de Pré-visualização de Imagem / PDF */}
      {previewAttachment && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewAttachment(null)}
          title={`Pré-visualização: ${previewAttachment.original_filename}`}
          maxWidth="2xl"
        >
          <div className="space-y-3">
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 rounded-xl p-2 border border-zinc-200 dark:border-zinc-800">
              {previewAttachment.content_type.startsWith("image/") ? (
                <img
                  src={walletApi.getAttachmentPreviewUrl(previewAttachment.id)}
                  alt={previewAttachment.original_filename}
                  className="max-h-[65vh] w-auto object-contain rounded-lg shadow-sm"
                />
              ) : (
                <iframe
                  src={walletApi.getAttachmentPreviewUrl(previewAttachment.id)}
                  title={previewAttachment.original_filename}
                  className="w-full h-[65vh] rounded-lg border-0"
                />
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
              <span>{previewAttachment.file_size_pretty}</span>
              <div className="flex items-center space-x-2">
                <a
                  href={walletApi.getAttachmentPreviewUrl(previewAttachment.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir em nova aba</span>
                </a>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
