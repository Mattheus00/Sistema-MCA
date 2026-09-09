import type { Inadimplencia, PagamentoInadimplencia } from "@/types/api";
import { statusEh } from "@/lib/constants/status";

export { formatarData, formatarMesAno, formatarMoeda } from "@/lib/valorBrasil";

export function ordenarPagamentosPorData(
  pagamentos: PagamentoInadimplencia[],
): PagamentoInadimplencia[] {
  return [...pagamentos].sort((a, b) => {
    const da = (a.dataPagamento || "").split("T")[0];
    const db = (b.dataPagamento || "").split("T")[0];
    const c = da.localeCompare(db);
    if (c !== 0) return c;
    return (a.criadoEm ?? "").localeCompare(b.criadoEm ?? "");
  });
}

export function diasEmAtraso(vencimento: string): number {
  const v = new Date(vencimento.split("T")[0]);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  v.setHours(0, 0, 0, 0);
  const diff = Math.floor((hoje.getTime() - v.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function formatCpfCnpj(cpf: string | undefined): string {
  if (!cpf) return "";
  const n = cpf.replace(/\D/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return cpf;
}

export function isInadimplenciaEmAberto(i: Inadimplencia): boolean {
  return !statusEh(i.status ?? "EmAberto", "PAGO", "QUITADA", "QUITADO", "CANCELADO", "CANCELADA");
}

export function statusPagamentoHonorario(i: Inadimplencia): "Pago" | "Parcial" | "Em aberto" {
  const s = String(i.status ?? "EmAberto").toLowerCase();
  if (s === "pago" || s === "quitada") return "Pago";
  if (s === "parcial" || s === "acordo") return "Parcial";
  return "Em aberto";
}

export function isInadimplenciaCancelada(i: Inadimplencia): boolean {
  return statusEh(i.status, "CANCELADO", "CANCELADA");
}

export function saldoDevedorItem(i: Inadimplencia): number {
  const totalDaApi = i.valor ?? i.valorDevedor ?? 0;
  const juros = i.juros ?? 0;
  const valorOriginal =
    i.valorOriginal != null
      ? i.valorOriginal
      : totalDaApi > 0
        ? Math.max(0, totalDaApi - juros)
        : 0;
  return totalDaApi > 0 ? totalDaApi : valorOriginal + juros;
}

export function valoresHonorario(i: Inadimplencia) {
  const totalDaApi = i.valor ?? i.valorDevedor ?? 0;
  const juros = i.juros ?? 0;
  const valorOriginal =
    i.valorOriginal != null
      ? i.valorOriginal
      : totalDaApi > 0
        ? Math.max(0, totalDaApi - juros)
        : 0;
  const valorTotal = totalDaApi > 0 ? totalDaApi : valorOriginal + juros;
  return { valorOriginal, juros, valorTotal };
}
