import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api, getApiErrorMessage, isMockEnabled, normalizeListResponse } from "@/lib/api";
import { normalizeInadimplenciaFromApi } from "@/lib/apiNormalizers";
import { invalidateDashboard } from "@/lib/dashboardRefresh";
import {
  diasEmAtraso,
  isInadimplenciaEmAberto,
} from "@/lib/inadimplentesUtils";
import type { Inadimplencia } from "@/types/api";

export default function WebInadimplentes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [itens, setItens] = useState<Inadimplencia[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState<"cliente" | "valor" | "dias" | null>(null);
  const [ordemAsc, setOrdemAsc] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [buscaLista, setBuscaLista] = useState("");
  const itensPorPagina = 10;
  const [modalAjustarJurosAberto, setModalAjustarJurosAberto] = useState(false);
  const [jurosGlobal, setJurosGlobal] = useState<{ multa: string; juros: string }>({ multa: "0,33", juros: "2" });
  const [loadingJurosGlobal, setLoadingJurosGlobal] = useState(false);

  async function listar() {
    try {
      setLoading(true);
      setErro(null);
      const r = await api.get("/api/inadimplentes", { params: { paginado: false } });
      const rawList = normalizeListResponse<Record<string, unknown>>(r.data);
      setItens(isMockEnabled() ? (rawList as Inadimplencia[]) : rawList.map((item) => normalizeInadimplenciaFromApi(item)));
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao listar inadimplências"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listar();
  }, []);

  useEffect(() => {
    const state = location.state as { mensagemSucesso?: string } | null;
    if (state?.mensagemSucesso) {
      setMensagemSucesso(state.mensagemSucesso);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 4000);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  /** Inclui EmAberto, PARCIAL, Acordo e equivalentes — exclui só Pago/Quitada e Cancelado/Cancelada */
  const emAberto = itens.filter(isInadimplenciaEmAberto);

  /** Agrupa por cliente: soma valor, vencimento mais antigo, maior dias em atraso */
  const agrupadosPorCliente = (() => {
    const map = new Map<string, { clienteNome: string; valor: number; vencimento: string; diasMax: number }>();
    for (const i of emAberto) {
      const id = i.clienteId;
      const nome = i.clienteNome ?? `Cliente #${id}`;
      const valor = i.valor ?? i.valorDevedor ?? 0;
      const dias = diasEmAtraso(i.vencimento);
      const atual = map.get(id);
      if (!atual) {
        map.set(id, { clienteNome: nome, valor, vencimento: i.vencimento, diasMax: dias });
      } else {
        atual.valor += valor;
        if (i.vencimento < atual.vencimento) atual.vencimento = i.vencimento;
        if (dias > atual.diasMax) atual.diasMax = dias;
      }
    }
    return Array.from(map.entries()).map(([clienteId, v]) => ({
      clienteId,
      clienteNome: v.clienteNome,
      valor: v.valor,
      vencimento: v.vencimento,
      diasEmAtraso: v.diasMax,
    }));
  })();

  const termoBusca = buscaLista.trim().toLowerCase();
  const filtradosPorBusca = termoBusca
    ? agrupadosPorCliente.filter((c) => c.clienteNome.toLowerCase().includes(termoBusca))
    : agrupadosPorCliente;

  const totalValor = agrupadosPorCliente.reduce((s, i) => s + i.valor, 0);
  const diasList = emAberto.map((i) => diasEmAtraso(i.vencimento)).filter((d) => d > 0);
  const mediaAtraso = diasList.length ? Math.round(diasList.reduce((a, b) => a + b, 0) / diasList.length) : 0;

  const ordenados = [...filtradosPorBusca].sort((a, b) => {
    if (!ordenarPor) return 0;
    const mul = ordemAsc ? 1 : -1;
    if (ordenarPor === "cliente")
      return mul * (a.clienteNome.localeCompare(b.clienteNome));
    if (ordenarPor === "valor") return mul * (a.valor - b.valor);
    if (ordenarPor === "dias") return mul * (a.diasEmAtraso - b.diasEmAtraso);
    return 0;
  });

  const totalPaginasInad = Math.max(1, Math.ceil(ordenados.length / itensPorPagina));
  const paginaAtualInad = Math.min(pagina, totalPaginasInad);
  const itensPaginaInad = ordenados.slice((paginaAtualInad - 1) * itensPorPagina, paginaAtualInad * itensPorPagina);

  useEffect(() => {
    if (pagina > totalPaginasInad && totalPaginasInad >= 1) setPagina(1);
  }, [ordenados.length, totalPaginasInad, pagina]);

  useEffect(() => {
    setPagina(1);
  }, [buscaLista]);

  function toggleOrdenacao(campo: "cliente" | "valor" | "dias") {
    if (ordenarPor === campo) setOrdemAsc((x) => !x);
    else {
      setOrdenarPor(campo);
      setOrdemAsc(true);
    }
  }

  function parsePct(s: string): number {
    const norm = s.replace(/\./g, "").replace(",", ".");
    const v = Number(norm);
    return Number.isFinite(v) ? v : 0;
  }

  async function abrirModalAjustarJuros() {
    setModalAjustarJurosAberto(true);
    try {
      setLoadingJurosGlobal(true);
      const res = await api.get("/api/config/juros");
      const cfg = res.data ?? {};
      setJurosGlobal({
        multa: (Number(cfg.multaDiaria ?? 0.0033) * 100).toString().replace(".", ","),
        juros: (Number(cfg.jurosMensal ?? 0.02) * 100).toString().replace(".", ","),
      });
    } catch {
      setJurosGlobal({ multa: "0,33", juros: "2" });
    } finally {
      setLoadingJurosGlobal(false);
    }
  }

  async function salvarJurosGlobal() {
    try {
      setLoadingJurosGlobal(true);
      const multa = parsePct(jurosGlobal.multa);
      const jurosMes = parsePct(jurosGlobal.juros);
      await api.put("/api/config/juros", {
        multaDiaria: multa / 100,
        capMultaPercentual: 0.0999,
        jurosMensal: jurosMes / 100,
      });
      setMensagemSucesso("Configuração de juros salva globalmente.");
      setModalAjustarJurosAberto(false);
      invalidateDashboard();
      await listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao salvar configuração de juros."));
    } finally {
      setLoadingJurosGlobal(false);
    }
  }

  async function desativarJurosGlobal() {
    try {
      setLoadingJurosGlobal(true);
      await api.put("/api/config/juros", {
        multaDiaria: 0,
        capMultaPercentual: 0,
        jurosMensal: 0,
      });
      setMensagemSucesso("Juros desativados globalmente.");
      setModalAjustarJurosAberto(false);
      invalidateDashboard();
      await listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao desativar juros."));
    } finally {
      setLoadingJurosGlobal(false);
    }
  }

  return (
    <div className="page-inadimplentes">
      <p className="page-inadimplentes__contexto">Sistema de Gestão de Inadimplentes</p>
      <h1 className="page-inadimplentes__title">Lista de Inadimplentes</h1>
      <p className="page-inadimplentes__subtitle">Clientes com pagamentos em atraso</p>

      {mensagemSucesso && <p className="toast toast--sucesso">{mensagemSucesso}</p>}
      {erro && <p className="page-inadimplentes__erro">{erro}</p>}

      <div className="page-inadimplentes__acao-topo">
        <button type="button" className="btn btn--primary" onClick={() => navigate("/inadimplentes/registrar")}>
          <PlusIcon />
          Registrar inadimplência
        </button>
        <button type="button" className="btn btn--primary btn--ajustar-juros" onClick={abrirModalAjustarJuros}>
          <SlidersIcon />
          Ajustar juros
        </button>
      </div>

      <div className="page-inadimplentes__cards">
        <div className="page-inadimplentes__card">
          <span className="page-inadimplentes__card-label">
            Total de inadimplentes
            <InfoIcon />
          </span>
          <span className="page-inadimplentes__card-value">
            {loading ? "—" : agrupadosPorCliente.length}
          </span>
        </div>
        <div className="page-inadimplentes__card">
          <span className="page-inadimplentes__card-label">Valor total em aberto</span>
          <span className="page-inadimplentes__card-value">
            {loading ? "—" : totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
        <div className="page-inadimplentes__card">
          <span className="page-inadimplentes__card-label">Média de atraso</span>
          <span className="page-inadimplentes__card-value">
            {loading ? "—" : `${mediaAtraso} dias`}
          </span>
        </div>
      </div>

      <section className="page-inadimplentes__tabela-secao">
        <div className="page-inadimplentes__tabela-header">
          <h2 className="page-inadimplentes__tabela-titulo">Clientes Inadimplentes</h2>
          <div className="page-inadimplentes__busca">
            <SearchIcon />
            <input
              type="text"
              placeholder="Buscar cliente por nome..."
              value={buscaLista}
              onChange={(e) => setBuscaLista(e.target.value)}
              className="page-inadimplentes__busca-input"
              aria-label="Buscar cliente inadimplente"
            />
          </div>
        </div>
        <div className="page-inadimplentes__tabela-wrap">
          <table className="page-inadimplentes__tabela">
            <thead>
              <tr>
                <th>
                  <button type="button" className="page-inadimplentes__th" onClick={() => toggleOrdenacao("cliente")}>
                    Cliente <SortIcon />
                  </button>
                </th>
                <th>
                  <button type="button" className="page-inadimplentes__th" onClick={() => toggleOrdenacao("valor")}>
                    Valor <SortIcon />
                  </button>
                </th>
                <th>
                  <button type="button" className="page-inadimplentes__th" onClick={() => toggleOrdenacao("dias")}>
                    Dias em atraso <SortIcon />
                  </button>
                </th>
                <th className="page-inadimplentes__th-acao">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="page-inadimplentes__loading">Carregando...</td>
                </tr>
              ) : ordenados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="page-inadimplentes__vazio">
                    {termoBusca ? "Nenhum inadimplente encontrado para a busca." : "Nenhum inadimplente em aberto."}
                  </td>
                </tr>
              ) : (
                itensPaginaInad.map((d) => (
                  <tr key={d.clienteId}>
                    <td>{d.clienteNome}</td>
                    <td>{d.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td>{d.diasEmAtraso} dias</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--secondary btn--small page-inadimplentes__btn-meses"
                        onClick={() => navigate(`/inadimplentes/${d.clienteId}/honorarios`)}
                      >
                        <EyeIcon /> Ver honorários
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      {ordenados.length > itensPorPagina && (
        <div className="page-inadimplentes__paginacao">
          <button
            type="button"
            className="btn btn--secondary btn--small"
            disabled={paginaAtualInad <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className="page-inadimplentes__paginacao-info">
            Página {paginaAtualInad} de {totalPaginasInad} ({ordenados.length} inadimplente{ordenados.length !== 1 ? "s" : ""})
          </span>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            disabled={paginaAtualInad >= totalPaginasInad}
            onClick={() => setPagina((p) => Math.min(totalPaginasInad, p + 1))}
          >
            Próxima
          </button>
        </div>
      )}
      </section>

      {modalAjustarJurosAberto && (
        <div className="modal-overlay" onClick={() => !loadingJurosGlobal && setModalAjustarJurosAberto(false)}>
          <div className="modal modal--cadastro modal--pagamento" onClick={(e) => e.stopPropagation()}>
            <p className="modal__eyebrow">AJUSTAR JUROS</p>
            <h2 className="modal__titulo">Configuração global</h2>
            <div className="modal__grid">
              <label className="modal__label modal__label--full">Multa diária (% ao dia)</label>
              <input
                type="text"
                className="modal__input modal__input--full"
                value={jurosGlobal.multa}
                onChange={(e) => setJurosGlobal((prev) => ({ ...prev, multa: e.target.value }))}
                disabled={loadingJurosGlobal}
              />
              <label className="modal__label modal__label--full">Juros ao mês (%)</label>
              <input
                type="text"
                className="modal__input modal__input--full"
                value={jurosGlobal.juros}
                onChange={(e) => setJurosGlobal((prev) => ({ ...prev, juros: e.target.value }))}
                disabled={loadingJurosGlobal}
              />
            </div>
            <div className="modal__botoes modal__botoes--duplo">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={desativarJurosGlobal}
                disabled={loadingJurosGlobal}
              >
                Desativar juros
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setModalAjustarJurosAberto(false)}
                disabled={loadingJurosGlobal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={salvarJurosGlobal}
                disabled={loadingJurosGlobal}
              >
                {loadingJurosGlobal ? "Salvando..." : "Salvar juros"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="page-inadimplentes__info-icon" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 11.5v5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
