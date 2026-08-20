/** Utilitários compartilhados da Área do Cliente. */

export function onlyDigitsCpfCnpj(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

export function maskCpfCnpj(value: string): string {
  const n = onlyDigitsCpfCnpj(value);
  if (n.length <= 11) {
    return n
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return n
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

export function formatarMoedaPortal(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(valor)) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarDataPortal(iso: string | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const MESES_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function formatarDataPortalExtenso(iso: string | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} de ${MESES_EXTENSO[m - 1]} de ${y}`;
}

export function parseDataPortal(iso: string | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function diasParaVencimento(vencimento: string | undefined): number | null {
  const v = parseDataPortal(vencimento);
  if (!v) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.floor((v.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function diasAtrasoPortal(vencimento: string | undefined): number {
  const dias = diasParaVencimento(vencimento);
  if (dias == null) return 0;
  return dias < 0 ? Math.abs(dias) : 0;
}

export function labelStatusDividaPortal(status: string | undefined, vencimento?: string): string {
  const s = String(status ?? "").toLowerCase();
  if (s === "pago" || s === "quitada") return "Quitada";
  if (diasAtrasoPortal(vencimento) > 0 || s === "vencida" || s === "inadimplente") return "Vencida";
  return "Em aberto";
}

export function statusDividaPortalClass(status: string | undefined, vencimento?: string): string {
  const label = labelStatusDividaPortal(status, vencimento);
  if (label === "Vencida") return "portal-status portal-status--vencida";
  if (label === "Quitada") return "portal-status portal-status--quitada";
  return "portal-status portal-status--aberta";
}

export function obterProximoVencimento<T extends { vencimento?: string; status?: string }>(dividas: T[]): T | null {
  const abertas = dividas.filter((d) => labelStatusDividaPortal(d.status, d.vencimento) !== "Quitada");
  if (!abertas.length) return null;
  const ordenadas = [...abertas].sort((a, b) => {
    const da = parseDataPortal(a.vencimento)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const db = parseDataPortal(b.vencimento)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return da - db;
  });
  const futuras = ordenadas.filter((d) => (diasParaVencimento(d.vencimento) ?? -1) >= 0);
  return futuras[0] ?? ordenadas[0];
}

export function ordenarDividasRecentes<T extends { vencimento?: string }>(dividas: T[], limite = 3): T[] {
  return [...dividas]
    .sort((a, b) => {
      const da = parseDataPortal(a.vencimento)?.getTime() ?? 0;
      const db = parseDataPortal(b.vencimento)?.getTime() ?? 0;
      return db - da;
    })
    .slice(0, limite);
}

export function labelTipoDocumento(tipo: string): string {
  const map: Record<string, string> = {
    COMPROVANTE: "Comprovante",
    NOTA_FISCAL: "Nota fiscal",
    CONTRATO: "Contrato",
    DECLARACAO: "Declaração",
    OUTRO: "Outro",
  };
  return map[tipo] ?? tipo;
}

export function labelStatusDocumento(status: string): string {
  const map: Record<string, string> = {
    ENVIADO: "Aguardando escritório",
    RECEBIDO: "Recebido",
    EM_ANALISE: "Em análise",
    ARQUIVADO: "Arquivado",
  };
  return map[String(status).toUpperCase()] ?? status;
}

export function classeBadgeStatusDocumentoPortal(status: string): string {
  const s = String(status).toUpperCase();
  if (s === "ENVIADO") return "portal-badge--enviado";
  if (s === "EM_ANALISE") return "portal-badge--em_analise";
  if (s === "ARQUIVADO") return "portal-badge--arquivado";
  return "portal-badge--recebido";
}
