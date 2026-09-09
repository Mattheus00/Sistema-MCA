import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchAllInadimplentes, listarPagamentosDivida } from "@/lib/inadimplentesApi";
import { obterAging, obterResumoFinanceiro, obterResumoRelatorio } from "@/lib/relatoriosApi";
import { DASHBOARD_INVALIDATE_EVENT } from "@/lib/dashboardRefresh";
import {
  calcularEvolucaoValorAberto,
  contarClientesInadimplentes,
  enriquecerValoresAtividades,
  mapAgingParaFaixas,
  mapInadimplenciasParaAtividades,
  somarBaixadoCancelado,
} from "@/lib/dashboardUtils";
import type { AtividadeDashboard, FaixaInadimplenciaUi, PontoEvolucao } from "@/types/dashboard";
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

export function useDashboardData(
  periodoChart: PeriodoChart,
  periodoEvolucao: PeriodoEvolucao,
  dataInicio: string,
  dataFim: string,
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
      setState((s) => ({
        ...s,
        erro: false,
        loading: modo === "inicial",
        loadingChart: modo === "inicial",
        atualizando: modo === "atualizar",
      }));

      try {
        const [rResumo, rChart, rFinanceiro, rInad, rAging] = await Promise.allSettled([
          obterResumoRelatorio({ cacheBust: true }),
          obterResumoRelatorio({
            dias: periodoChart === "total" ? undefined : periodoChart,
            cacheBust: true,
          }),
          obterResumoFinanceiro(dataInicio, dataFim, { cacheBust: true }),
          fetchAllInadimplentes(),
          obterAging({ cacheBust: true }),
        ]);

        const resumo = rResumo.status === "fulfilled" ? rResumo.value : null;
        const resumoChart = rChart.status === "fulfilled" ? rChart.value : null;
        const resumoFinanceiro = rFinanceiro.status === "fulfilled" ? rFinanceiro.value : null;

        let inadimplentes: Inadimplencia[] = [];
        if (rInad.status === "fulfilled") {
          inadimplentes = rInad.value;
        }

        const aging = rAging.status === "fulfilled" ? rAging.value : null;
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
    [periodoChart, dataInicio, dataFim],
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

  const [atividades, setAtividades] = useState<AtividadeDashboard[]>([]);

  const totalClientes = state.resumo?.totalClientes ?? 0;
  const clientesInadimplentes = contarClientesInadimplentes(state.inadimplentes);
  const percentualInadimplentes =
    totalClientes > 0 ? (clientesInadimplentes / totalClientes) * 100 : null;

  const pagamentosRecebidos =
    state.resumoFinanceiro?.totalRecebido ?? state.resumo?.totalPago ?? null;

  const evolucao: PontoEvolucao[] = useMemo(
    () => calcularEvolucaoValorAberto(state.inadimplentes, periodoEvolucao),
    [state.inadimplentes, periodoEvolucao],
  );
  const faixasInadimplencia: FaixaInadimplenciaUi[] = useMemo(
    () => mapAgingParaFaixas(state.aging),
    [state.aging],
  );

  useEffect(() => {
    const base = mapInadimplenciasParaAtividades(state.inadimplentes);
    setAtividades(base);
    let ativo = true;
    void enriquecerValoresAtividades(base, listarPagamentosDivida).then((enriquecidas) => {
      if (ativo) setAtividades(enriquecidas);
    });
    return () => {
      ativo = false;
    };
  }, [state.inadimplentes]);

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
