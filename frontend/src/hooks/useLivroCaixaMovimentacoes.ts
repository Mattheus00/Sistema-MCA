import { useCallback, useEffect, useState } from "react";
import type { AbaLivroCaixa } from "@/hooks/livroCaixaTypes";
import {
  LIVRO_CAIXA_INVALIDATE_EVENT,
  atualizarMovimentacao,
  criarMovimentacao,
  invalidateLivroCaixa,
  listarCategorias,
  listarContas,
  listarMovimentacoes,
  obterAnaliseLivroCaixa,
  obterDashboardLivroCaixa,
  obterMovimentacao,
  obterRelatorioLivroCaixa,
} from "@/lib/livroCaixaApi";
import {
  calcularPeriodoRapido,
  paramsFiltroRapido,
  type FiltroRapidoMovimentacao,
  type PeriodoRapido,
} from "@/lib/livroCaixaUtils";
import type {
  CategoriaLivroCaixa,
  ContaLivroCaixa,
  CriarMovimentacaoPayload,
  FormaPagamento,
  LivroCaixaDashboard,
  MovimentacaoDetalhe,
  MovimentacaoResumo,
  StatusMovimentacao,
  TipoMovimentacao,
} from "@/types/livroCaixa";
import type { AnaliseLivroCaixa, RelatorioLivroCaixa } from "@/types/livroCaixa";

export function useLivroCaixaMovimentacoes() {
  const [aba, setAba] = useState<AbaLivroCaixa>("movimentacoes");
  const [dashboard, setDashboard] = useState<LivroCaixaDashboard | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoResumo[]>([]);
  const [categorias, setCategorias] = useState<CategoriaLivroCaixa[]>([]);
  const [contas, setContas] = useState<ContaLivroCaixa[]>([]);
  const [analise, setAnalise] = useState<AnaliseLivroCaixa | null>(null);
  const [relatorio, setRelatorio] = useState<RelatorioLivroCaixa | null>(null);

  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);

  const [periodoRapido, setPeriodoRapido] = useState<PeriodoRapido>("ESTE_MES");
  const [dataInicio, setDataInicio] = useState(() => calcularPeriodoRapido("ESTE_MES").dataInicio);
  const [dataFim, setDataFim] = useState(() => calcularPeriodoRapido("ESTE_MES").dataFim);

  const [filtroRapido, setFiltroRapido] = useState<FiltroRapidoMovimentacao>("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoMovimentacao | "">("");
  const [statusFiltro, setStatusFiltro] = useState<StatusMovimentacao | "">("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [contaFiltro, setContaFiltro] = useState("");
  const [formaFiltro, setFormaFiltro] = useState<FormaPagamento | "">("");
  const [busca, setBusca] = useState("");
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState(false);

  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingAnalise, setLoadingAnalise] = useState(false);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const [modalForm, setModalForm] = useState<"criar" | "editar" | null>(null);
  const [detalhe, setDetalhe] = useState<MovimentacaoDetalhe | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [salvandoForm, setSalvandoForm] = useState(false);
  const [cadastrosAberto, setCadastrosAberto] = useState(false);

  const recarregarTudo = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const [dash, cats, cts] = await Promise.all([
        obterDashboardLivroCaixa(),
        listarCategorias(false),
        listarContas(false),
      ]);
      setDashboard(dash);
      setCategorias(cats);
      setContas(cts);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar dashboard.");
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  const carregarLista = useCallback(async () => {
    setLoadingLista(true);
    setErro(null);
    try {
      const rapido = paramsFiltroRapido(filtroRapido);
      const data = await listarMovimentacoes({
        page: pagina,
        size: 20,
        tipo: (rapido.tipo ?? tipoFiltro) || undefined,
        status: (rapido.status ?? statusFiltro) || undefined,
        categoriaId: categoriaFiltro || undefined,
        contaId: contaFiltro || undefined,
        formaPagamento: formaFiltro || undefined,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
        busca: busca.trim() || undefined,
        sort: "dataMovimentacao,desc",
      });
      setMovimentacoes(data.content);
      setTotalPaginas(Math.max(1, data.totalPages));
      setTotalElementos(data.totalElements);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar movimentações.");
    } finally {
      setLoadingLista(false);
    }
  }, [
    pagina,
    filtroRapido,
    tipoFiltro,
    statusFiltro,
    categoriaFiltro,
    contaFiltro,
    formaFiltro,
    dataInicio,
    dataFim,
    busca,
  ]);

  const carregarAnalise = useCallback(async () => {
    if (!dataInicio || !dataFim) return;
    setLoadingAnalise(true);
    try {
      const data = await obterAnaliseLivroCaixa(dataInicio, dataFim);
      setAnalise(data);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar análise.");
    } finally {
      setLoadingAnalise(false);
    }
  }, [dataInicio, dataFim]);

  const carregarRelatorio = useCallback(async () => {
    if (!dataInicio || !dataFim) return;
    setLoadingRelatorio(true);
    try {
      const data = await obterRelatorioLivroCaixa(dataInicio, dataFim);
      setRelatorio(data);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar relatório.");
    } finally {
      setLoadingRelatorio(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    void recarregarTudo();
  }, [recarregarTudo]);

  useEffect(() => {
    if (aba === "movimentacoes") void carregarLista();
  }, [aba, carregarLista]);

  useEffect(() => {
    if (aba === "analise") void carregarAnalise();
  }, [aba, carregarAnalise]);

  useEffect(() => {
    if (aba === "relatorio") void carregarRelatorio();
  }, [aba, carregarRelatorio]);

  useEffect(() => {
    const handler = () => void recarregarTudo();
    window.addEventListener(LIVRO_CAIXA_INVALIDATE_EVENT, handler);
    return () => window.removeEventListener(LIVRO_CAIXA_INVALIDATE_EVENT, handler);
  }, [recarregarTudo]);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 4000);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  function aplicarPeriodoRapido(id: PeriodoRapido) {
    setPeriodoRapido(id);
    if (id !== "PERSONALIZADO") {
      const { dataInicio: ini, dataFim: fim } = calcularPeriodoRapido(id);
      setDataInicio(ini);
      setDataFim(fim);
    }
    setPagina(0);
  }

  function aplicarFiltroRapido(f: FiltroRapidoMovimentacao) {
    setFiltroRapido((atual) => (atual === f ? "" : f));
    setTipoFiltro("");
    setStatusFiltro("");
    setPagina(0);
  }

  async function abrirDetalhe(id: string) {
    setCarregandoDetalhe(true);
    try {
      const m = await obterMovimentacao(id);
      setDetalhe(m);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao abrir detalhe.");
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  function sincronizarLista(m: MovimentacaoResumo) {
    setMovimentacoes((lista) => lista.map((item) => (item.id === m.id ? { ...item, ...m } : item)));
  }

  async function salvarForm(payload: CriarMovimentacaoPayload) {
    setSalvandoForm(true);
    try {
      if (modalForm === "editar" && detalhe) {
        const atualizado = await atualizarMovimentacao(detalhe.id, payload);
        setDetalhe(atualizado);
        sincronizarLista(atualizado);
        setMensagemSucesso("Movimentação atualizada.");
      } else {
        await criarMovimentacao(payload);
        setMensagemSucesso("Movimentação criada.");
      }
      setModalForm(null);
      invalidateLivroCaixa();
      void recarregarTudo();
      void carregarLista();
    } finally {
      setSalvandoForm(false);
    }
  }

  return {
    aba,
    setAba,
    dashboard,
    movimentacoes,
    categorias,
    contas,
    analise,
    relatorio,
    pagina,
    setPagina,
    totalPaginas,
    totalElementos,
    periodoRapido,
    dataInicio,
    setDataInicio,
    dataFim,
    setDataFim,
    filtroRapido,
    setFiltroRapido,
    tipoFiltro,
    setTipoFiltro,
    statusFiltro,
    setStatusFiltro,
    categoriaFiltro,
    setCategoriaFiltro,
    contaFiltro,
    setContaFiltro,
    formaFiltro,
    setFormaFiltro,
    busca,
    setBusca,
    mostrarFiltrosAvancados,
    setMostrarFiltrosAvancados,
    loadingDashboard,
    loadingLista,
    loadingAnalise,
    loadingRelatorio,
    erro,
    mensagemSucesso,
    modalForm,
    setModalForm,
    detalhe,
    setDetalhe,
    carregandoDetalhe,
    salvandoForm,
    cadastrosAberto,
    setCadastrosAberto,
    recarregarTudo,
    carregarLista,
    aplicarPeriodoRapido,
    aplicarFiltroRapido,
    abrirDetalhe,
    sincronizarLista,
    salvarForm,
  };
}
