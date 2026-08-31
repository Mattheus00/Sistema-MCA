import type { CategoriaLivroCaixa, FormaPagamento, OrigemMovimentacao, StatusMovimentacao, TipoMovimentacao } from "@/types/livroCaixa";
import { formatarMoeda } from "@/lib/inadimplentesUtils";

/** Nome canônico da categoria que exige vínculo com cliente (identificação por nome, não por UUID). */
export const NOME_CATEGORIA_HONORARIOS_CONTABEIS = "Honorários contábeis";

export function isCategoriaHonorariosContabeis(categoriaId: string, categorias: CategoriaLivroCaixa[]): boolean {
  if (!categoriaId) return false;
  const cat = categorias.find((c) => c.id === categoriaId);
  if (!cat || cat.tipo !== "ENTRADA") return false;
  return cat.nome.trim().toLowerCase() === NOME_CATEGORIA_HONORARIOS_CONTABEIS.toLowerCase();
}

export type PeriodoRapido =
  | "HOJE"
  | "7_DIAS"
  | "ESTE_MES"
  | "MES_PASSADO"
  | "ULTIMOS_3_MESES"
  | "ESTE_ANO"
  | "PERSONALIZADO";

export type FiltroRapidoMovimentacao = "" | "A_PAGAR" | "A_RECEBER";

export const PERIODOS_RAPIDOS: Array<{ id: PeriodoRapido; label: string }> = [
  { id: "HOJE", label: "Hoje" },
  { id: "7_DIAS", label: "7 dias" },
  { id: "ESTE_MES", label: "Este mês" },
  { id: "MES_PASSADO", label: "Mês passado" },
  { id: "ULTIMOS_3_MESES", label: "Últimos 3 meses" },
  { id: "ESTE_ANO", label: "Este ano" },
  { id: "PERSONALIZADO", label: "Personalizado" },
];

export const FORMAS_PAGAMENTO: FormaPagamento[] = [
  "PIX",
  "DINHEIRO",
  "BOLETO",
  "CARTAO_CREDITO",
  "CARTAO_DEBITO",
  "TRANSFERENCIA",
  "DEBITO_AUTOMATICO",
  "OUTRO",
];

export function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatarDataLivroCaixa(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

export function formatarMesLabel(mes: string): string {
  if (!mes) return "—";
  if (mes.includes("/")) return mes;
  const [y, m] = mes.split("-");
  if (!y || !m) return mes;
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const idx = Number(m) - 1;
  return `${meses[idx] ?? m}/${y.slice(2)}`;
}

export function labelTipoMovimentacao(tipo: TipoMovimentacao): string {
  return tipo === "ENTRADA" ? "Entrada" : "Saída";
}

export function labelStatusMovimentacao(status: StatusMovimentacao): string {
  switch (status) {
    case "PREVISTO":
      return "Previsto";
    case "RECEBIDO":
      return "Recebido";
    case "PAGO":
      return "Pago";
    case "CANCELADO":
      return "Cancelado";
    default:
      return status;
  }
}

export function labelFormaPagamento(forma?: FormaPagamento): string {
  if (!forma) return "—";
  switch (forma) {
    case "PIX":
      return "PIX";
    case "DINHEIRO":
      return "Dinheiro";
    case "BOLETO":
      return "Boleto";
    case "CARTAO_CREDITO":
      return "Cartão crédito";
    case "CARTAO_DEBITO":
      return "Cartão débito";
    case "TRANSFERENCIA":
      return "Transferência";
    case "DEBITO_AUTOMATICO":
      return "Débito automático";
    case "OUTRO":
      return "Outro";
    default:
      return forma;
  }
}

export function labelOrigemMovimentacao(origem?: OrigemMovimentacao): string {
  if (!origem) return "—";
  switch (origem) {
    case "MANUAL":
      return "Manual";
    case "INADIMPLENCIA":
      return "Inadimplência";
    case "RECORRENTE":
      return "Recorrente";
    case "IMPORTACAO":
      return "Importação";
    default:
      return "Outro";
  }
}

export function classeBadgeStatus(status: StatusMovimentacao): string {
  switch (status) {
    case "RECEBIDO":
    case "PAGO":
      return "livro-caixa__badge livro-caixa__badge--ok";
    case "PREVISTO":
      return "livro-caixa__badge livro-caixa__badge--previsto";
    case "CANCELADO":
      return "livro-caixa__badge livro-caixa__badge--cancelado";
    default:
      return "livro-caixa__badge";
  }
}

export function classeValorMovimentacao(tipo: TipoMovimentacao): string {
  return tipo === "ENTRADA" ? "livro-caixa__valor--entrada" : "livro-caixa__valor--saida";
}

export function formatarValorMovimentacao(tipo: TipoMovimentacao, valor: number): string {
  const prefixo = tipo === "ENTRADA" ? "+" : "−";
  return `${prefixo} ${formatarMoeda(Math.abs(valor))}`;
}

export function statusPermitidosPorTipo(tipo: TipoMovimentacao): StatusMovimentacao[] {
  return tipo === "ENTRADA" ? ["PREVISTO", "RECEBIDO", "CANCELADO"] : ["PREVISTO", "PAGO", "CANCELADO"];
}

export function statusEfetivado(tipo: TipoMovimentacao): StatusMovimentacao {
  return tipo === "ENTRADA" ? "RECEBIDO" : "PAGO";
}

export function calcularPeriodoRapido(periodo: PeriodoRapido): { dataInicio: string; dataFim: string } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = hojeIso();

  function iso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  switch (periodo) {
    case "HOJE":
      return { dataInicio: fim, dataFim: fim };
    case "7_DIAS": {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 6);
      return { dataInicio: iso(inicio), dataFim: fim };
    }
    case "ESTE_MES": {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { dataInicio: iso(inicio), dataFim: fim };
    }
    case "MES_PASSADO": {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const ultimo = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return { dataInicio: iso(inicio), dataFim: iso(ultimo) };
    }
    case "ULTIMOS_3_MESES": {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
      return { dataInicio: iso(inicio), dataFim: fim };
    }
    case "ESTE_ANO": {
      const inicio = new Date(hoje.getFullYear(), 0, 1);
      return { dataInicio: iso(inicio), dataFim: fim };
    }
    default:
      return { dataInicio: "", dataFim: "" };
  }
}

export function paramsFiltroRapido(filtro: FiltroRapidoMovimentacao): {
  tipo?: TipoMovimentacao;
  status?: StatusMovimentacao;
} {
  if (filtro === "A_PAGAR") return { tipo: "SAIDA", status: "PREVISTO" };
  if (filtro === "A_RECEBER") return { tipo: "ENTRADA", status: "PREVISTO" };
  return {};
}

export function formatarTamanhoArquivo(bytes?: number): string {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
