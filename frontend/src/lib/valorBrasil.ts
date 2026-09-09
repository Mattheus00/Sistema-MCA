/**
 * Converte string de valor em reais (formato BR ou com ponto decimal).
 * Formato BR: ponto = milhar, vírgula = decimal (ex.: 1.000,00 = 1000).
 * Sem vírgula: ponto como decimal (ex.: 150.50).
 */
export function parseValorReais(s: string): number {
  let v = s
    .trim()
    .replace(/\s/g, "")
    .replace(/[^\d.,]/g, "");
  if (!v) return 0;
  if (v.includes(",")) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = v.match(/\./g);
    if (dots && dots.length > 1) {
      v = v.replace(/\./g, "");
    } else if (dots && dots.length === 1) {
      const parts = v.split(".");
      if (parts[1]?.length === 3) v = v.replace(".", "");
    }
  }
  return parseFloat(v) || 0;
}

/** Formata centavos para exibição no input (ex.: 20000 → "200,00"). */
export function formatarCentavosParaInput(centavos: number | null | undefined): string {
  if (centavos == null || centavos === 0) return "";
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formata valor em reais para exibição no input (ex.: 200 → "200,00"). API retorna valores em reais. */
export function formatarReaisParaInput(valor: number | null | undefined): string {
  if (valor == null || valor === 0) return "";
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const MOEDA_BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATA_INSTANT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export type FormatacaoMoedaOpcoes = {
  /** Texto quando o valor é nulo/não-finito. Default: "—". */
  vazio?: string;
  /** Trata nulo/não-finito como 0 (exibe R$ 0,00), usado em relatórios. */
  nuloComoZero?: boolean;
};

/** Formata valor em reais com símbolo R$ (pt-BR). */
export function formatarMoeda(
  valor: number | null | undefined,
  opcoes: FormatacaoMoedaOpcoes = {},
): string {
  if (valor == null || !Number.isFinite(valor)) {
    if (opcoes.nuloComoZero) return MOEDA_BRL.format(0);
    return opcoes.vazio ?? "—";
  }
  return MOEDA_BRL.format(valor);
}

export type FormatacaoDataOpcoes = {
  vazio?: string;
  /**
   * `iso` (default): recorta YYYY-MM-DD sem fuso (datas de vencimento/cadastro).
   * `instant`: `new Date` + locale (timestamps com hora, PDFs/dashboard).
   */
  modo?: "iso" | "instant";
};

/** Formata ISO (`YYYY-MM-DD` ou datetime) para `dd/mm/aaaa`. */
export function formatarData(
  iso: string | null | undefined,
  opcoes: FormatacaoDataOpcoes = {},
): string {
  const vazio = opcoes.vazio ?? "—";
  if (!iso) return vazio;
  if ((opcoes.modo ?? "iso") === "iso") {
    const [y, m, d] = iso.split("T")[0].split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return DATA_INSTANT.format(d);
}

export type FormatacaoDataHoraOpcoes = {
  vazio?: string;
  /** Se o instante for inválido, formata só a data (ISO) em vez de devolver o texto cru. */
  fallbackData?: boolean;
};

/** Formata ISO datetime para `dd/mm/aaaa, hh:mm`. */
export function formatarDataHora(
  iso: string | null | undefined,
  opcoes: FormatacaoDataHoraOpcoes = {},
): string {
  const vazio = opcoes.vazio ?? "—";
  if (!iso) return vazio;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return opcoes.fallbackData ? formatarData(iso) : iso;
  }
  return DATA_HORA.format(d);
}

/** Formata `YYYY-MM` ou ISO datetime para `mm/aaaa`. */
export function formatarMesAno(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m] = iso.split("T")[0].split("-");
  if (!y || !m) return iso;
  return `${m}/${y}`;
}

/** Sinal +/− + moeda, para livro-caixa (entrada/saída). */
export function formatarValorMovimentacao(tipo: "ENTRADA" | "SAIDA", valor: number): string {
  const prefixo = tipo === "ENTRADA" ? "+" : "−";
  return `${prefixo} ${formatarMoeda(Math.abs(valor))}`;
}
