/**
 * Camada de API de relatórios (RelatorioController — /api/relatorios).
 * Componentes e hooks não devem chamar `api` diretamente — use as funções daqui.
 */

import { api, isMockEnabled } from "@/lib/api";
import {
  normalizeInadimplenciaPeriodoFromApi,
  normalizePagamentosRecebidosFromApi,
  normalizeRankingFromApi,
  normalizeResumoFinanceiroFromApi,
  normalizeResumoRelatorioFromApi,
} from "@/lib/apiNormalizers";
import type {
  AgingRelatorio,
  EfetividadeCobrancaRelatorio,
  ExtratoCliente,
  InadimplenciaPeriodoRelatorio,
  PagamentosRecebidosRelatorio,
  RankingDevedorItem,
  ResumoFinanceiro,
  ResumoRelatorio,
} from "@/types/api";

type OpcoesCache = {
  /** Acrescenta `_t=<timestamp>` para furar cache do navegador/proxy (dashboard). */
  cacheBust?: boolean;
};

/**
 * Espelha AgingReportDTO (totalDividas, valorTotal, faixas: FaixaAgingDTO[] { faixa, quantidade, valor }).
 * Mock: valorTotalGeral, faixas[].qtdDividas/valorTotal/percentual. Quando o percentual não vem,
 * é calculado a partir do total geral.
 */
export function normalizeAgingFromApi(data: unknown): AgingRelatorio | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const faixasRaw = Array.isArray(raw.faixas) ? (raw.faixas as Record<string, unknown>[]) : [];
  const valorTotalBase = Number(raw.valorTotalGeral ?? raw.valorTotal ?? 0);
  const valorTotalGeral = Number.isFinite(valorTotalBase) ? valorTotalBase : 0;
  const faixas = faixasRaw.map((f) => {
    const valorRaw = Number(f.valorTotal ?? f.valor ?? 0);
    const valorTotal = Number.isFinite(valorRaw) ? valorRaw : 0;
    const qtdRaw = Number(f.qtdDividas ?? f.quantidade ?? 0);
    const qtdDividas = Number.isFinite(qtdRaw) ? qtdRaw : 0;
    const percentualRaw = Number(f.percentual);
    const percentual =
      Number.isFinite(percentualRaw) && percentualRaw > 0
        ? percentualRaw
        : valorTotalGeral > 0
          ? (valorTotal / valorTotalGeral) * 100
          : 0;
    return {
      faixa: String(f.faixa ?? "-"),
      qtdDividas,
      valorTotal,
      percentual,
    };
  });
  return { faixas, valorTotalGeral };
}

/** GET /api/relatorios/resumo[?dias=N] → ResumoRelatorioDTO. */
export async function obterResumoRelatorio(
  opts: OpcoesCache & { dias?: number } = {},
): Promise<ResumoRelatorio | null> {
  const query = new URLSearchParams();
  if (opts.dias != null) query.set("dias", String(opts.dias));
  if (opts.cacheBust) query.set("_t", String(Date.now()));
  const qs = query.toString();
  const r = await api.get(`/api/relatorios/resumo${qs ? `?${qs}` : ""}`);
  return normalizeResumoRelatorioFromApi(r.data);
}

/** GET /api/relatorios/resumo-financeiro?periodoInicio&periodoFim → ResumoFinanceiroDTO. */
export async function obterResumoFinanceiro(
  periodoInicio: string,
  periodoFim: string,
  opts: OpcoesCache = {},
): Promise<ResumoFinanceiro | null> {
  const params: Record<string, string | number> = { periodoInicio, periodoFim };
  if (opts.cacheBust) params._t = Date.now();
  const r = await api.get("/api/relatorios/resumo-financeiro", { params });
  return normalizeResumoFinanceiroFromApi(r.data);
}

/** GET /api/relatorios/aging → AgingReportDTO. */
export async function obterAging(opts: OpcoesCache = {}): Promise<AgingRelatorio | null> {
  const r = opts.cacheBust
    ? await api.get("/api/relatorios/aging", { params: { _t: Date.now() } })
    : await api.get("/api/relatorios/aging");
  return normalizeAgingFromApi(r.data);
}

export type FiltrosRanking = {
  periodo: string;
  limit: number;
  valorMin?: string;
  qtdDividas?: string;
  diasAtraso?: string;
};

/** GET /api/relatorios/ranking-devedores → RankingDevedoresDTO (mock devolve array já no formato do front). */
export async function obterRankingDevedores(
  filtros: FiltrosRanking,
): Promise<RankingDevedorItem[]> {
  const params = new URLSearchParams();
  params.set("periodo", filtros.periodo);
  params.set("limit", String(filtros.limit));
  if (filtros.valorMin) params.set("valorMin", filtros.valorMin);
  if (filtros.qtdDividas) params.set("qtdDividas", filtros.qtdDividas);
  if (filtros.diasAtraso) params.set("diasAtraso", filtros.diasAtraso);
  const r = await api.get<RankingDevedorItem[] | { ranking?: unknown[] }>(
    `/api/relatorios/ranking-devedores?${params}`,
  );
  return isMockEnabled() && Array.isArray(r.data) ? r.data : normalizeRankingFromApi(r.data);
}

/** GET /api/relatorios/extrato-cliente/{clienteId} → ExtratoClienteDTO (mesmo formato do front). */
export async function obterExtratoCliente(clienteId: string): Promise<ExtratoCliente> {
  const r = await api.get<ExtratoCliente>(`/api/relatorios/extrato-cliente/${clienteId}`);
  return r.data;
}

/** GET /api/relatorios/inadimplencia-periodo?dataInicio&dataFim → RelatorioInadimplentesDTO. */
export async function obterInadimplenciaPeriodo(
  dataInicio: string,
  dataFim: string,
): Promise<InadimplenciaPeriodoRelatorio | null> {
  const r = await api.get(
    `/api/relatorios/inadimplencia-periodo?dataInicio=${dataInicio}&dataFim=${dataFim}`,
  );
  return isMockEnabled()
    ? (r.data as InadimplenciaPeriodoRelatorio)
    : (normalizeInadimplenciaPeriodoFromApi(r.data) ?? null);
}

/** GET /api/relatorios/pagamentos-recebidos — endpoint opcional (só existe no mock). */
export async function obterPagamentosRecebidos(
  dataInicio: string,
  dataFim: string,
): Promise<PagamentosRecebidosRelatorio | null> {
  const r = await api.get("/api/relatorios/pagamentos-recebidos", {
    params: { dataInicio, dataFim },
  });
  return isMockEnabled()
    ? (r.data as PagamentosRecebidosRelatorio)
    : normalizePagamentosRecebidosFromApi(r.data);
}

/** GET /api/relatorios/efetividade-cobranca?mes=YYYY-MM (mesmo formato do front). */
export async function obterEfetividadeCobranca(mes: string): Promise<EfetividadeCobrancaRelatorio> {
  const r = await api.get<EfetividadeCobrancaRelatorio>(
    `/api/relatorios/efetividade-cobranca?mes=${mes}`,
  );
  return r.data;
}
