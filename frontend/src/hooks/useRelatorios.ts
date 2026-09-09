import { useCallback, useEffect, useState } from "react";
import { carregarPagamentosRecebidos } from "@/components/relatorios/carregarPagamentosRecebidos";
import { getApiErrorMessage, getRelatorioErrorMessage } from "@/lib/api";
import { listarClientes } from "@/lib/clientesApi";
import {
  exportarRelatorioPdf,
  type DadosRelatorioPdf,
  type RelatorioAbaId,
} from "@/lib/relatorioPdf";
import {
  obterAging,
  obterEfetividadeCobranca,
  obterExtratoCliente,
  obterInadimplenciaPeriodo,
  obterRankingDevedores,
} from "@/lib/relatoriosApi";
import type {
  AgingRelatorio,
  Cliente,
  EfetividadeCobrancaRelatorio,
  ExtratoCliente,
  InadimplenciaPeriodoRelatorio,
  PagamentosRecebidosRelatorio,
  RankingDevedorItem,
} from "@/types/api";

export function useRelatorios(aba: RelatorioAbaId) {
  const [erro, setErro] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  const [ranking, setRanking] = useState<RankingDevedorItem[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState("mes");
  const [filtroLimit, setFiltroLimit] = useState(20);
  const [filtroValorMin, setFiltroValorMin] = useState("");
  const [filtroQtdDividas, setFiltroQtdDividas] = useState("");
  const [filtroDiasAtraso, setFiltroDiasAtraso] = useState("");

  const [clienteExtratoId, setClienteExtratoId] = useState<string>("");
  const [extrato, setExtrato] = useState<ExtratoCliente | null>(null);
  const [loadingExtrato, setLoadingExtrato] = useState(false);

  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [inadPeriodo, setInadPeriodo] = useState<InadimplenciaPeriodoRelatorio | null>(null);
  const [loadingInadPeriodo, setLoadingInadPeriodo] = useState(false);

  const [dataInicioPag, setDataInicioPag] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFimPag, setDataFimPag] = useState(() => new Date().toISOString().slice(0, 10));
  const [pagamentos, setPagamentos] = useState<PagamentosRecebidosRelatorio | null>(null);
  const [loadingPagamentos, setLoadingPagamentos] = useState(false);

  const [aging, setAging] = useState<AgingRelatorio | null>(null);
  const [loadingAging, setLoadingAging] = useState(false);

  const [mesEfetividade, setMesEfetividade] = useState(() => new Date().toISOString().slice(0, 7));
  const [efetividade, setEfetividade] = useState<EfetividadeCobrancaRelatorio | null>(null);
  const [loadingEfetividade, setLoadingEfetividade] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingClientes(true);
      try {
        setClientes(await listarClientes({ page: 0, size: 500 }));
      } catch {
        setClientes([]);
      } finally {
        setLoadingClientes(false);
      }
    })();
  }, []);

  const carregarRanking = useCallback(async () => {
    setErro(null);
    setLoadingRanking(true);
    try {
      setRanking(
        await obterRankingDevedores({
          periodo: filtroPeriodo,
          limit: filtroLimit,
          valorMin: filtroValorMin,
          qtdDividas: filtroQtdDividas,
          diasAtraso: filtroDiasAtraso,
        }),
      );
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar ranking"));
      setRanking([]);
    } finally {
      setLoadingRanking(false);
    }
  }, [filtroPeriodo, filtroLimit, filtroValorMin, filtroQtdDividas, filtroDiasAtraso]);

  useEffect(() => {
    if (aba === "ranking") void carregarRanking();
  }, [aba, carregarRanking]);

  const carregarExtrato = useCallback(async () => {
    if (!clienteExtratoId) {
      setExtrato(null);
      return;
    }
    setErro(null);
    setLoadingExtrato(true);
    try {
      setExtrato(await obterExtratoCliente(clienteExtratoId));
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar extrato"));
      setExtrato(null);
    } finally {
      setLoadingExtrato(false);
    }
  }, [clienteExtratoId]);

  useEffect(() => {
    if (aba === "extrato" && clienteExtratoId) void carregarExtrato();
    else if (aba === "extrato" && !clienteExtratoId) setExtrato(null);
  }, [aba, clienteExtratoId, carregarExtrato]);

  const carregarInadimplenciaPeriodo = useCallback(async () => {
    setErro(null);
    setLoadingInadPeriodo(true);
    try {
      setInadPeriodo(await obterInadimplenciaPeriodo(dataInicio, dataFim));
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar relatório"));
      setInadPeriodo(null);
    } finally {
      setLoadingInadPeriodo(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    if (aba === "inadimplencia") void carregarInadimplenciaPeriodo();
  }, [aba, carregarInadimplenciaPeriodo]);

  const carregarPagamentos = useCallback(async () => {
    setErro(null);
    setLoadingPagamentos(true);
    try {
      setPagamentos(await carregarPagamentosRecebidos(dataInicioPag, dataFimPag));
    } catch (e: unknown) {
      setErro(getRelatorioErrorMessage(e, "Falha ao carregar pagamentos recebidos"));
      setPagamentos(null);
    } finally {
      setLoadingPagamentos(false);
    }
  }, [dataInicioPag, dataFimPag]);

  useEffect(() => {
    if (aba === "pagamentos") void carregarPagamentos();
  }, [aba, carregarPagamentos]);

  const carregarAging = useCallback(async () => {
    setErro(null);
    setLoadingAging(true);
    try {
      setAging((await obterAging()) ?? { faixas: [], valorTotalGeral: 0 });
    } catch (e: unknown) {
      setErro(getRelatorioErrorMessage(e, "Falha ao carregar aging"));
      setAging(null);
    } finally {
      setLoadingAging(false);
    }
  }, []);

  useEffect(() => {
    if (aba === "aging") void carregarAging();
  }, [aba, carregarAging]);

  const carregarEfetividade = useCallback(async () => {
    setErro(null);
    setLoadingEfetividade(true);
    try {
      setEfetividade(await obterEfetividadeCobranca(mesEfetividade));
    } catch (e: unknown) {
      setErro(getRelatorioErrorMessage(e, "Falha ao carregar efetividade"));
      setEfetividade(null);
    } finally {
      setLoadingEfetividade(false);
    }
  }, [mesEfetividade]);

  useEffect(() => {
    if (aba === "efetividade") void carregarEfetividade();
  }, [aba, carregarEfetividade]);

  const gerarRelatorioPdf = useCallback(async (dados: DadosRelatorioPdf) => {
    try {
      await exportarRelatorioPdf(dados);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar o PDF.");
    }
  }, []);

  return {
    erro,
    setErro,
    gerarRelatorioPdf,
    clientes,
    loadingClientes,
    ranking,
    loadingRanking,
    filtroPeriodo,
    setFiltroPeriodo,
    filtroLimit,
    setFiltroLimit,
    filtroValorMin,
    setFiltroValorMin,
    filtroQtdDividas,
    setFiltroQtdDividas,
    filtroDiasAtraso,
    setFiltroDiasAtraso,
    clienteExtratoId,
    setClienteExtratoId,
    extrato,
    loadingExtrato,
    dataInicio,
    setDataInicio,
    dataFim,
    setDataFim,
    inadPeriodo,
    loadingInadPeriodo,
    dataInicioPag,
    setDataInicioPag,
    dataFimPag,
    setDataFimPag,
    pagamentos,
    loadingPagamentos,
    aging,
    loadingAging,
    mesEfetividade,
    setMesEfetividade,
    efetividade,
    loadingEfetividade,
  };
}
