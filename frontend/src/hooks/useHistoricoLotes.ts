import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { consultarResultadoEnvioLote, listarHistoricoLotes } from "@/lib/envioBoletosApi";
import type { LoteEnvioBoletoResumo, ResultadoEnvioLote } from "@/types/api";
import type { AbaPrincipal, EnvioBoletosFeedback } from "@/hooks/envioBoletosTypes";

export function useHistoricoLotes(
  { setLoading, setErro }: EnvioBoletosFeedback,
  aba: AbaPrincipal,
) {
  const [historico, setHistorico] = useState<LoteEnvioBoletoResumo[]>([]);
  const [historicoPagina, setHistoricoPagina] = useState(0);
  const [historicoTotalPaginas, setHistoricoTotalPaginas] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [resultadoHistorico, setResultadoHistorico] = useState<ResultadoEnvioLote | null>(null);

  const carregarHistorico = useCallback(
    async (page: number) => {
      try {
        setLoading(true);
        setErro(null);
        const pagina = await listarHistoricoLotes({
          page,
          size: 10,
          status: filtroStatus,
          dataInicio: filtroDataInicio,
          dataFim: filtroDataFim,
        });
        setHistorico(pagina.content);
        setHistoricoTotalPaginas(Math.max(1, pagina.totalPages));
        setHistoricoPagina(pagina.number);
      } catch (e: unknown) {
        setErro(getApiErrorMessage(e, "Falha ao carregar o histórico."));
      } finally {
        setLoading(false);
      }
    },
    [filtroStatus, filtroDataInicio, filtroDataFim, setErro, setLoading],
  );

  // Ref com a versão mais recente: a troca de aba dispara a carga, mas mudar filtros não.
  const carregarHistoricoRef = useRef(carregarHistorico);
  useEffect(() => {
    carregarHistoricoRef.current = carregarHistorico;
  }, [carregarHistorico]);

  async function abrirDetalheHistorico(loteId: string) {
    try {
      setLoading(true);
      setErro(null);
      setResultadoHistorico(await consultarResultadoEnvioLote(loteId));
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar o lote."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (aba === "historico") void carregarHistoricoRef.current(0);
  }, [aba]);

  return {
    historico,
    historicoPagina,
    historicoTotalPaginas,
    filtroStatus,
    setFiltroStatus,
    filtroDataInicio,
    setFiltroDataInicio,
    filtroDataFim,
    setFiltroDataFim,
    resultadoHistorico,
    setResultadoHistorico,
    carregarHistorico,
    carregarHistoricoRef,
    abrirDetalheHistorico,
  };
}
