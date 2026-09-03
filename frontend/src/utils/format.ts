export function formatCurrency(cents: number, hideValues: boolean = false): string {
  if (hideValues) {
    return "••••••";
  }
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Converte data ISO YYYY-MM-DD para formato brasileiro DD/MM/YYYY
 */
export function formatDateToBR(isoDate?: string | null): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

/**
 * Converte data brasileira DD/MM/YYYY para ISO YYYY-MM-DD
 */
export function parseDateBRToISO(brDate?: string | null): string | null {
  if (!brDate) return null;
  const clean = brDate.trim();
  const parts = clean.split("/");
  if (parts.length !== 3) return null;
  const [dayStr, monthStr, yearStr] = parts;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // Validação estrita do calendário real
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return null;
  }

  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Aplica máscara automática DD/MM/YYYY enquanto o usuário digita
 */
export function maskDateBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Retorna a data de hoje no formato DD/MM/YYYY
 */
export function getTodayBR(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Converte string digitada pelo usuário (ex: "1.500,50", "1500,50", "1500.50", "1000", "R$ 250,00")
 * para valor inteiro em centavos de forma segura e resiliente.
 */
export function parseCurrencyInputToCents(value: string): number {
  if (!value) return 0;
  const clean = value.trim().replace(/^R\$\s?/, "").replace(/\s/g, "");
  if (!clean) return 0;

  // Se contiver ponto e vírgula (ex: 1.500,50 ou 1,500.50)
  if (clean.includes(".") && clean.includes(",")) {
    const lastComma = clean.lastIndexOf(",");
    const lastDot = clean.lastIndexOf(".");
    if (lastComma > lastDot) {
      // Padrão brasileiro: 1.500,50 -> remove pontos e troca vírgula por ponto
      const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
      return isNaN(num) ? 0 : Math.round(num * 100);
    } else {
      // Padrão americano: 1,500.50 -> remove vírgulas
      const num = parseFloat(clean.replace(/,/g, ""));
      return isNaN(num) ? 0 : Math.round(num * 100);
    }
  }

  // Se contiver apenas vírgula (ex: 1500,50 ou 50,00)
  if (clean.includes(",")) {
    const num = parseFloat(clean.replace(",", "."));
    return isNaN(num) ? 0 : Math.round(num * 100);
  }

  // Se contiver apenas números e eventualmente ponto decimal (ex: 1500.50 ou 1000)
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

