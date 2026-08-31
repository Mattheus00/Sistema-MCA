import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AdminItemCard from "@/components/AdminItemCard";
import ResponsiveList from "@/components/ResponsiveList";
import { MetricCard } from "@/components/dashboard/MetricCard";
import LivroCaixaCadastrosModal from "@/components/livro-caixa/LivroCaixaCadastrosModal";
import LivroCaixaDetalheModal from "@/components/livro-caixa/LivroCaixaDetalheModal";
import LivroCaixaFormModal from "@/components/livro-caixa/LivroCaixaFormModal";
import { formatarMoedaDashboard } from "@/lib/dashboardUtils";
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
  FORMAS_PAGAMENTO,
  PERIODOS_RAPIDOS,
  calcularPeriodoRapido,
  classeBadgeStatus,
  classeValorMovimentacao,
  formatarDataLivroCaixa,
  formatarMesLabel,
  formatarValorMovimentacao,
  labelFormaPagamento,
  labelStatusMovimentacao,
  labelTipoMovimentacao,
  paramsFiltroRapido,
  type FiltroRapidoMovimentacao,
  type PeriodoRapido,
} from "@/lib/livroCaixaUtils";
import { formatarMoeda } from "@/lib/inadimplentesUtils";
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

type AbaLivroCaixa = "movimentacoes" | "analise" | "relatorio";

const CORES_PIZZA = ["#A43F9B", "#7c3aed", "#6366f1", "#0ea5e9", "#14b8a6", "#22c55e", "#eab308", "#f97316"];

function WalletIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export default function WebLivroCaixa() {
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
  }, [pagina, filtroRapido, tipoFiltro, statusFiltro, categoriaFiltro, contaFiltro, formaFiltro, dataInicio, dataFim, busca]);

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

  function renderLinhaAcoes(m: MovimentacaoResumo) {
    return (
      <button type="button" className="btn btn--link" onClick={() => void abrirDetalhe(m.id)}>
        Ver
      </button>
    );
  }

  const dadosBarra =
    analise?.entradasSaidasMensal.map((s) => ({
      mes: formatarMesLabel(s.mes),
      Entradas: s.entradas,
      Saídas: s.saidas,
    })) ?? [];

  const dadosPizza =
    analise?.despesasPorCategoria.map((d) => ({
      name: d.categoriaNome,
      value: d.valor,
    })) ?? [];

  return (
    <div className="livro-caixa">
      <header className="livro-caixa__head">
        <div>
          <p className="livro-caixa__contexto">Sistema de Gestão de Inadimplentes</p>
          <h1 className="livro-caixa__titulo">Livro Caixa</h1>
          <p className="livro-caixa__subtitulo">Controle financeiro com saldo realizado, previsto e movimentações.</p>
        </div>
        <div className="livro-caixa__head-acoes">
          <button type="button" className="btn btn--secondary" onClick={() => setCadastrosAberto(true)}>
            Categorias e contas
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setModalForm("criar")}>
            + Nova movimentação
          </button>
        </div>
      </header>

      {mensagemSucesso && (
        <p className="toast toast--sucesso toast--flutuante" role="status">
          {mensagemSucesso}
        </p>
      )}

      {erro && (
        <p className="livro-caixa__erro" role="alert">
          {erro}
        </p>
      )}

      <div className="dash-metrics livro-caixa__metrics">
        <MetricCard
          icon={<WalletIcon />}
          label="Saldo realizado"
          value={dashboard ? formatarMoedaDashboard(dashboard.saldoRealizado) : "—"}
          hint={dashboard ? `Previsto: ${formatarMoedaDashboard(dashboard.saldoPrevisto)}` : undefined}
          hintTone="success"
          loading={loadingDashboard}
          iconTone="wallet"
        />
        <MetricCard
          icon={<ArrowUpIcon />}
          label="Entradas do mês"
          value={dashboard ? formatarMoedaDashboard(dashboard.entradasMes) : "—"}
          loading={loadingDashboard}
          iconTone="money"
        />
        <MetricCard
          icon={<ArrowDownIcon />}
          label="Saídas do mês"
          value={dashboard ? formatarMoedaDashboard(dashboard.saidasMes) : "—"}
          hintTone="warning"
          loading={loadingDashboard}
          iconTone="alert"
        />
        <MetricCard
          icon={<ChartIcon />}
          label="Resultado do mês"
          value={dashboard ? formatarMoedaDashboard(dashboard.resultadoMes) : "—"}
          loading={loadingDashboard}
          iconTone="purple"
        />
      </div>

      <div className="livro-caixa__saldo-duplo" aria-label="Comparativo de saldos">
        <div className="livro-caixa__saldo-item livro-caixa__saldo-item--realizado">
          <span>Saldo realizado</span>
          <strong>{dashboard ? formatarMoeda(dashboard.saldoRealizado) : "—"}</strong>
          <small>Movimentações já recebidas/pagas</small>
        </div>
        <div className="livro-caixa__saldo-item livro-caixa__saldo-item--previsto">
          <span>Saldo previsto</span>
          <strong>{dashboard ? formatarMoeda(dashboard.saldoPrevisto) : "—"}</strong>
          <small>Inclui contas a pagar e a receber</small>
        </div>
      </div>

      <div className="livro-caixa__periodos">
        {PERIODOS_RAPIDOS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`dash-pill${periodoRapido === p.id ? " dash-pill--active" : ""}`}
            onClick={() => aplicarPeriodoRapido(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {periodoRapido === "PERSONALIZADO" && (
        <div className="livro-caixa__periodo-custom">
          <label>
            De
            <input type="date" className="modal__input" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </label>
          <label>
            Até
            <input type="date" className="modal__input" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </label>
          <button type="button" className="btn btn--secondary" onClick={() => { setPagina(0); void carregarLista(); }}>
            Aplicar
          </button>
        </div>
      )}

      <div className="livro-caixa__abas">
        {(["movimentacoes", "analise", "relatorio"] as AbaLivroCaixa[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`livro-caixa__aba${aba === id ? " livro-caixa__aba--ativa" : ""}`}
            onClick={() => setAba(id)}
          >
            {id === "movimentacoes" ? "Movimentações" : id === "analise" ? "Análise" : "Relatório"}
          </button>
        ))}
      </div>

      {aba === "movimentacoes" && (
        <>
          <div className="livro-caixa__filtros-rapidos">
            <button type="button" className={`livro-caixa__chip${filtroRapido === "A_PAGAR" ? " livro-caixa__chip--ativa" : ""}`} onClick={() => aplicarFiltroRapido("A_PAGAR")}>
              A pagar
            </button>
            <button type="button" className={`livro-caixa__chip${filtroRapido === "A_RECEBER" ? " livro-caixa__chip--ativa" : ""}`} onClick={() => aplicarFiltroRapido("A_RECEBER")}>
              A receber
            </button>
            <button type="button" className="btn btn--link" onClick={() => setMostrarFiltrosAvancados((v) => !v)}>
              {mostrarFiltrosAvancados ? "Ocultar filtros" : "Mais filtros"}
            </button>
          </div>

          {mostrarFiltrosAvancados && (
            <div className="livro-caixa__filtros-avancados">
              <select className="modal__input" value={tipoFiltro} onChange={(e) => { setTipoFiltro(e.target.value as TipoMovimentacao | ""); setFiltroRapido(""); setPagina(0); }}>
                <option value="">Tipo</option>
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </select>
              <select className="modal__input" value={statusFiltro} onChange={(e) => { setStatusFiltro(e.target.value as StatusMovimentacao | ""); setFiltroRapido(""); setPagina(0); }}>
                <option value="">Status</option>
                <option value="PREVISTO">Previsto</option>
                <option value="RECEBIDO">Recebido</option>
                <option value="PAGO">Pago</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
              <select className="modal__input" value={categoriaFiltro} onChange={(e) => { setCategoriaFiltro(e.target.value); setPagina(0); }}>
                <option value="">Categoria</option>
                {categorias.filter((c) => c.ativa).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <select className="modal__input" value={contaFiltro} onChange={(e) => { setContaFiltro(e.target.value); setPagina(0); }}>
                <option value="">Conta</option>
                {contas.filter((c) => c.ativa).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <select className="modal__input" value={formaFiltro} onChange={(e) => { setFormaFiltro(e.target.value as FormaPagamento | ""); setPagina(0); }}>
                <option value="">Forma pagamento</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>{labelFormaPagamento(f)}</option>
                ))}
              </select>
              <input className="modal__input" placeholder="Buscar descrição…" value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setPagina(0)} />
              <button type="button" className="btn btn--secondary" onClick={() => void carregarLista()}>Filtrar</button>
            </div>
          )}

          <ResponsiveList
            desktop={
              <div className="livro-caixa__tabela-wrap">
                <table className="livro-caixa__tabela">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Tipo</th>
                      <th>Forma</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLista ? (
                      <tr><td colSpan={8} className="livro-caixa__vazio">Carregando…</td></tr>
                    ) : movimentacoes.length === 0 ? (
                      <tr><td colSpan={8} className="livro-caixa__vazio">Nenhuma movimentação encontrada.</td></tr>
                    ) : (
                      movimentacoes.map((m) => (
                        <tr key={m.id} className={m.vencido ? "livro-caixa__linha--vencida" : m.proximoVencimento ? "livro-caixa__linha--proxima" : ""}>
                          <td>{formatarDataLivroCaixa(m.dataMovimentacao)}</td>
                          <td>
                            <strong>{m.descricao}</strong>
                            {m.vencido && <span className="livro-caixa__flag">Vencido</span>}
                            {m.proximoVencimento && !m.vencido && <span className="livro-caixa__flag livro-caixa__flag--proximo">Próximo</span>}
                          </td>
                          <td>{m.categoriaNome ?? "—"}</td>
                          <td>{labelTipoMovimentacao(m.tipo)}</td>
                          <td>{labelFormaPagamento(m.formaPagamento)}</td>
                          <td className={classeValorMovimentacao(m.tipo)}>{formatarValorMovimentacao(m.tipo, m.valor)}</td>
                          <td><span className={classeBadgeStatus(m.status)}>{labelStatusMovimentacao(m.status)}</span></td>
                          <td>{renderLinhaAcoes(m)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            }
            mobile={loadingLista ? (
              <p className="livro-caixa__vazio">Carregando…</p>
            ) : movimentacoes.length === 0 ? (
              <p className="livro-caixa__vazio">Nenhuma movimentação encontrada.</p>
            ) : (
              movimentacoes.map((m) => (
                <AdminItemCard
                  key={m.id}
                  title={m.descricao}
                  meta={`${formatarDataLivroCaixa(m.dataMovimentacao)} · ${labelTipoMovimentacao(m.tipo)}`}
                  value={<span className={classeValorMovimentacao(m.tipo)}>{formatarValorMovimentacao(m.tipo, m.valor)}</span>}
                  fields={[
                    { label: "Categoria", value: m.categoriaNome ?? "—" },
                    { label: "Forma", value: labelFormaPagamento(m.formaPagamento) },
                    { label: "Status", value: <span className={classeBadgeStatus(m.status)}>{labelStatusMovimentacao(m.status)}</span> },
                  ]}
                  actions={renderLinhaAcoes(m)}
                  onClick={() => void abrirDetalhe(m.id)}
                  className={m.vencido ? "livro-caixa__card--vencida" : ""}
                />
              ))
            )}
          />

          <div className="livro-caixa__paginacao">
            <span>{totalElementos} registro(s)</span>
            <div>
              <button type="button" className="btn btn--secondary" disabled={pagina <= 0 || loadingLista} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
              <span>Página {pagina + 1} de {totalPaginas}</span>
              <button type="button" className="btn btn--secondary" disabled={pagina + 1 >= totalPaginas || loadingLista} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
            </div>
          </div>
        </>
      )}

      {aba === "analise" && (
        <div className="livro-caixa__analise">
          {loadingAnalise ? (
            <p className="livro-caixa__vazio">Carregando análise…</p>
          ) : (
            <>
              <section className="dash-card dash-card--chart">
                <h2 className="dash-card__title">Entradas x saídas mensal</h2>
                <div className="livro-caixa__chart-bar">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dadosBarra}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => Number(v).toLocaleString("pt-BR", { notation: "compact" })} />
                      <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                      <Legend />
                      <Bar dataKey="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Saídas" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div className="livro-caixa__analise-grid">
                <section className="dash-card dash-card--chart">
                  <h2 className="dash-card__title">Despesas por categoria</h2>
                  {dadosPizza.length === 0 ? (
                    <p className="livro-caixa__vazio">Sem despesas no período.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={dadosPizza} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                          {dadosPizza.map((_, i) => (
                            <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </section>

                <section className="dash-card livro-caixa__fluxo">
                  <h2 className="dash-card__title">Fluxo de caixa</h2>
                  {analise && (
                    <dl className="livro-caixa__fluxo-lista">
                      <div><dt>Saldo inicial</dt><dd>{formatarMoeda(analise.fluxoCaixa.saldoInicial)}</dd></div>
                      <div className="livro-caixa__fluxo-entrada"><dt>+ Entradas</dt><dd>{formatarMoeda(analise.fluxoCaixa.totalEntradas)}</dd></div>
                      <div className="livro-caixa__fluxo-saida"><dt>− Saídas</dt><dd>{formatarMoeda(analise.fluxoCaixa.totalSaidas)}</dd></div>
                      <div className="livro-caixa__fluxo-final"><dt>Saldo final</dt><dd>{formatarMoeda(analise.fluxoCaixa.saldoFinal)}</dd></div>
                    </dl>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      )}

      {aba === "relatorio" && (
        <div className="livro-caixa__relatorio">
          {loadingRelatorio ? (
            <p className="livro-caixa__vazio">Carregando relatório…</p>
          ) : relatorio ? (
            <>
              <div className="livro-caixa__relatorio-resumo">
                <div><span>Período</span><strong>{formatarDataLivroCaixa(relatorio.dataInicio)} — {formatarDataLivroCaixa(relatorio.dataFim)}</strong></div>
                <div><span>Saldo inicial</span><strong>{formatarMoeda(relatorio.saldoInicial)}</strong></div>
                <div><span>Entradas</span><strong className="livro-caixa__valor--entrada">{formatarMoeda(relatorio.totalEntradas)}</strong></div>
                <div><span>Saídas</span><strong className="livro-caixa__valor--saida">{formatarMoeda(relatorio.totalSaidas)}</strong></div>
                <div><span>Saldo final</span><strong>{formatarMoeda(relatorio.saldoFinal)}</strong></div>
              </div>

              {relatorio.porCategoria && relatorio.porCategoria.length > 0 && (
                <section className="dash-card">
                  <h2 className="dash-card__title">Por categoria</h2>
                  <ul className="livro-caixa__relatorio-categorias">
                    {relatorio.porCategoria.map((c) => (
                      <li key={c.categoriaNome}>
                        <strong>{c.categoriaNome}</strong>
                        <span>Entradas: {formatarMoeda(c.entradas)}</span>
                        <span>Saídas: {formatarMoeda(c.saidas)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="livro-caixa__tabela-wrap">
                <table className="livro-caixa__tabela">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.movimentacoes.length === 0 ? (
                      <tr><td colSpan={6} className="livro-caixa__vazio">Sem movimentações no período.</td></tr>
                    ) : (
                      relatorio.movimentacoes.map((m) => (
                        <tr key={m.id}>
                          <td>{formatarDataLivroCaixa(m.dataMovimentacao)}</td>
                          <td>{m.descricao}</td>
                          <td>{m.categoriaNome ?? "—"}</td>
                          <td>{labelTipoMovimentacao(m.tipo)}</td>
                          <td className={classeValorMovimentacao(m.tipo)}>{formatarValorMovimentacao(m.tipo, m.valor)}</td>
                          <td>{labelStatusMovimentacao(m.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="livro-caixa__vazio">Selecione um período válido.</p>
          )}
        </div>
      )}

      <LivroCaixaFormModal
        aberto={modalForm !== null}
        modo={modalForm === "editar" ? "editar" : "criar"}
        movimentacao={modalForm === "editar" ? detalhe : null}
        categorias={categorias}
        contas={contas}
        salvando={salvandoForm}
        onFechar={() => !salvandoForm && setModalForm(null)}
        onSalvar={salvarForm}
      />

      <LivroCaixaDetalheModal
        movimentacao={detalhe}
        contas={contas}
        carregando={carregandoDetalhe}
        onFechar={() => setDetalhe(null)}
        onAtualizado={(m) => {
          setDetalhe(m);
          sincronizarLista(m);
          invalidateLivroCaixa();
          void recarregarTudo();
        }}
        onEditar={(m) => {
          setDetalhe(m);
          setModalForm("editar");
        }}
      />

      <LivroCaixaCadastrosModal
        aberto={cadastrosAberto}
        categorias={categorias}
        contas={contas}
        onFechar={() => setCadastrosAberto(false)}
        onAtualizado={() => void recarregarTudo()}
      />
    </div>
  );
}
