import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api, fetchAllInadimplentes } from "@/lib/api";
import {
  normalizeResumoFinanceiroFromApi,
  normalizeResumoRelatorioFromApi,
} from "@/lib/apiNormalizers";
import { DASHBOARD_INVALIDATE_EVENT } from "@/lib/dashboardRefresh";
import {
  calcularEvolucaoValorAberto,
  contarClientesInadimplentes,
  mapAgingParaFaixas,
  mapInadimplenciasParaAtividades,
  somarBaixadoCancelado,
  type AtividadeDashboard,
  type FaixaInadimplenciaUi,
  type PontoEvolucao,
} from "@/lib/dashboardUtils";
import type { AgingRelatorio, Inadimplencia, ResumoFinanceiro, ResumoRelatorio } from "@/types/api";

export type PeriodoChart = 30 | 60 | 90 | "total";
export type PeriodoEvolucao = 6 | 12 | "total";

type DashboardState = {
  resumo: ResumoRelatorio | null;
  resumoChart: ResumoRelatorio | null;
  resumoFinanceiro: ResumoFinanceiro | null;
  inadimplentes: Inadimplencia[];
  aging: AgingRelatorio | null;
  erro: boolean;
  loading: boolean;
  loadingChart: boolean;
  atualizando: boolean;
};

function cacheBust() {
  return `_t=${Date.now()}`;
}

function urlResumoComPeriodo(periodo: PeriodoChart, t: string): string {
  if (periodo === "total") return `/api/relatorios/resumo?${t}`;
  return `/api/relatorios/resumo?dias=${periodo}&${t}`;
}

function normalizeAgingResponse(data: unknown): AgingRelatorio | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const faixasRaw = Array.isArray(raw.faixas) ? (raw.faixas as Record<string, unknown>[]) : [];
  const valorTotalGeral = Number(raw.valorTotalGeral ?? raw.valorTotal ?? 0);
  const faixas = faixasRaw.map((f) => {
    const valorTotal = Number(f.valorTotal ?? f.valor ?? 0);
    const qtdDividas = Number(f.qtdDividas ?? f.quantidade ?? 0);
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

export function useDashboardData(
  periodoChart: PeriodoChart,
  periodoEvolucao: PeriodoEvolucao,
  dataInicio: string,
  dataFim: string
) {
  const location = useLocation();
  const [state, setState] = useState<DashboardState>({
    resumo: null,
    resumoChart: null,
    resumoFinanceiro: null,
    inadimplentes: [],
    aging: null,
    erro: false,
    loading: true,
    loadingChart: true,
    atualizando: false,
  });

  const carregar = useCallback(
    async (modo: "inicial" | "atualizar" = "inicial") => {
      const t = cacheBust();
      setState((s) => ({
        ...s,
        erro: false,
        loading: modo === "inicial",
        loadingChart: modo === "inicial",
        atualizando: modo === "atualizar",
      }));

      try {
        const [rResumo, rChart, rFinanceiro, rInad, rAging] = await Promise.allSettled([
          api.get(`/api/relatorios/resumo?${t}`),
          api.get(urlResumoComPeriodo(periodoChart, t)),
          api.get("/api/relatorios/resumo-financeiro", {
            params: { periodoInicio: dataInicio, periodoFim: dataFim, _t: Date.now() },
          }),
          fetchAllInadimplentes(),
          api.get("/api/relatorios/aging", { params: { _t: Date.now() } }),
        ]);

        const resumo =
          rResumo.status === "fulfilled" ? normalizeResumoRelatorioFromApi(rResumo.value.data) : null;
        const resumoChart =
          rChart.status === "fulfilled" ? normalizeResumoRelatorioFromApi(rChart.value.data) : null;
        const resumoFinanceiro =
          rFinanceiro.status === "fulfilled" ? normalizeResumoFinanceiroFromApi(rFinanceiro.value.data) : null;

        let inadimplentes: Inadimplencia[] = [];
        if (rInad.status === "fulfilled") {
          inadimplentes = rInad.value;
        }

        const aging = rAging.status === "fulfilled" ? normalizeAgingResponse(rAging.value.data) : null;
        const falhouTudo = !resumo && !resumoChart && inadimplentes.length === 0;

        setState({
          resumo,
          resumoChart,
          resumoFinanceiro,
          inadimplentes,
          aging,
          erro: falhouTudo,
          loading: false,
          loadingChart: false,
          atualizando: false,
        });
      } catch {
        setState((s) => ({
          ...s,
          erro: true,
          loading: false,
          loadingChart: false,
          atualizando: false,
        }));
      }
    },
    [periodoChart, dataInicio, dataFim]
  );

  useEffect(() => {
    if (location.pathname !== "/dashboard") return;
    carregar("inicial");
  }, [location.pathname, periodoChart, dataInicio, dataFim, carregar]);

  useEffect(() => {
    if (location.pathname !== "/dashboard") return;
    const handler = () => carregar("atualizar");
    window.addEventListener(DASHBOARD_INVALIDATE_EVENT, handler);
    return () => window.removeEventListener(DASHBOARD_INVALIDATE_EVENT, handler);
  }, [location.pathname, carregar]);

  useEffect(() => {
    if (location.pathname !== "/dashboard") return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") carregar("atualizar");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [location.pathname, carregar]);

  const totalClientes = state.resumo?.totalClientes ?? 0;
  const clientesInadimplentes = contarClientesInadimplentes(state.inadimplentes);
  const percentualInadimplentes =
    totalClientes > 0 ? (clientesInadimplentes / totalClientes) * 100 : null;

  const pagamentosRecebidos =
    state.resumoFinanceiro?.totalRecebido ?? state.resumo?.totalPago ?? null;

  const evolucao: PontoEvolucao[] = calcularEvolucaoValorAberto(state.inadimplentes, periodoEvolucao);
  const faixasInadimplencia: FaixaInadimplenciaUi[] = mapAgingParaFaixas(state.aging);
  const atividades: AtividadeDashboard[] = mapInadimplenciasParaAtividades(state.inadimplentes);

  const montante = {
    aReceber: state.resumoChart?.totalEmAberto ?? 0,
    recebido: state.resumoChart?.totalPago ?? 0,
    baixadoCancelado: somarBaixadoCancelado(state.inadimplentes),
  };

  return {
    ...state,
    carregar,
    totalClientes,
    clientesInadimplentes,
    percentualInadimplentes,
    valorEmAberto: state.resumo?.totalEmAberto ?? null,
    pagamentosRecebidos,
    evolucao,
    faixasInadimplencia,
    atividades,
    montante,
  };
}
