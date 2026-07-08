import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { api, getApiErrorMessage, isMockEnabled, normalizeListResponse } from "@/lib/api";
import { parseValorReais } from "@/lib/valorBrasil";
import { normalizeClienteFromApi, normalizeInadimplenciaToApi } from "@/lib/apiNormalizers";
import { invalidateDashboard } from "@/lib/dashboardRefresh";
import { formatCpfCnpj } from "@/lib/inadimplentesUtils";
import type { Cliente } from "@/types/api";

type ServicoResumo = {
  servicoId: string;
  nome: string;
  descricao?: string | null;
  valorPadrao?: number | null;
  ativo?: boolean | null;
};

type MensalidadeRow = { rowId: number; mes: string; ano: string; valorDigitado: string; descricao: string };

const MESES = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export default function WebInadimplentesRegistro() {
  const navigate = useNavigate();
  const anoAtual = new Date().getFullYear();
  const ANOS = Array.from({ length: anoAtual - 2015 + 2 }, (_, i) => 2015 + i);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [clientes, setClientes] = useState<Pick<Cliente, "id" | "nome" | "cpf" | "email">[]>([]);
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteDropdownAberto, setClienteDropdownAberto] = useState(false);
  const [servicos, setServicos] = useState<ServicoResumo[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(false);
  const [modalServicosValorRowIndex, setModalServicosValorRowIndex] = useState<number | null>(null);
  const [servicosSelecionadosParaValor, setServicosSelecionadosParaValor] = useState<string[]>([]);
  const [servicosBuscaValor, setServicosBuscaValor] = useState("");
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const nextRowIdRef = useRef(1);

  const [formRegistro, setFormRegistro] = useState<{
    clienteId: string;
    mensalidades: MensalidadeRow[];
  }>({
    clienteId: "",
    mensalidades: [
      {
        rowId: 1,
        mes: String(new Date().getMonth() + 1).padStart(2, "0"),
        ano: String(anoAtual),
        valorDigitado: "",
        descricao: "",
      },
    ],
  });

  async function carregarClientes() {
    try {
      const r = await api.get("/api/clientes", { params: { page: 0, size: 500 } });
      const list = normalizeListResponse<Record<string, unknown>>(r.data);
      setClientes(
        list.map((c) => {
          const norm = normalizeClienteFromApi(c);
          return { id: norm.id ?? "", nome: norm.nome, cpf: norm.cpf, email: norm.email };
        })
      );
    } catch {
      setClientes([]);
    }
  }

  async function carregarServicos() {
    if (isMockEnabled()) {
      setServicos([]);
      return;
    }
    try {
      setLoadingServicos(true);
      const r = await api.get("/api/servicos");
      const data = Array.isArray(r.data)
        ? r.data
        : r.data && (r.data as { content?: unknown[] }).content && Array.isArray((r.data as { content: unknown[] }).content)
          ? (r.data as { content: unknown[] }).content
          : [];
      const list: ServicoResumo[] = (data as Record<string, unknown>[]).map((s) => ({
        servicoId: String(s.servicoId ?? ""),
        nome: String(s.nome ?? ""),
        descricao: s.descricao != null ? String(s.descricao) : null,
        valorPadrao: s.valorPadrao != null ? Number(s.valorPadrao) : null,
        ativo: s.ativo != null ? Boolean(s.ativo) : true,
      }));
      setServicos(list);
    } catch {
      setServicos([]);
    } finally {
      setLoadingServicos(false);
    }
  }

  useEffect(() => {
    void carregarClientes();
    void carregarServicos();
  }, []);

  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(clienteBusca.trim().toLowerCase())
  );
  const clienteSelecionado = clientes.find((c) => c.id === formRegistro.clienteId);

  function ultimoDiaDoMes(mes: string, ano: string): string {
    const y = Number(ano);
    const m = Number(mes);
    if (!y || !m) return "";
    const d = new Date(y, m, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function adicionarMensalidade() {
    setFormRegistro((prev) => ({
      ...prev,
      mensalidades: [
        ...prev.mensalidades,
        { rowId: nextRowIdRef.current++, mes: "01", ano: String(anoAtual), valorDigitado: "", descricao: "" },
      ],
    }));
  }

  function atualizarMensalidade(index: number, campo: keyof MensalidadeRow, valor: string) {
    setFormRegistro((prev) => ({
      ...prev,
      mensalidades: prev.mensalidades.map((row, i) => (i === index ? { ...row, [campo]: valor } : row)),
    }));
  }

  function removerMensalidade(index: number) {
    if (formRegistro.mensalidades.length <= 1) return;
    setFormRegistro((prev) => ({
      ...prev,
      mensalidades: prev.mensalidades.filter((_, i) => i !== index),
    }));
  }

  const totalMensalidades = formRegistro.mensalidades.reduce(
    (s, row) => s + parseValorReais(row.valorDigitado),
    0
  );
  const qtdPeriodosComValor = formRegistro.mensalidades.filter((row) => parseValorReais(row.valorDigitado) > 0).length;

  function abrirModalServicosParaValor(rowIndex: number) {
    setModalServicosValorRowIndex(rowIndex);
    setServicosSelecionadosParaValor([]);
    setServicosBuscaValor("");
  }

  const somaServicosModalReais = servicos
    .filter((s) => servicosSelecionadosParaValor.includes(s.servicoId))
    .reduce((acc, s) => acc + (s.valorPadrao ?? 0), 0);

  function aplicarServicosAoValor() {
    if (modalServicosValorRowIndex === null) return;
    const valorStr =
      somaServicosModalReais > 0
        ? somaServicosModalReais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "";
    atualizarMensalidade(modalServicosValorRowIndex, "valorDigitado", valorStr);
    setModalServicosValorRowIndex(null);
  }

  function toggleServicoParaValor(servicoId: string) {
    setServicosSelecionadosParaValor((prev) =>
      prev.includes(servicoId) ? prev.filter((id) => id !== servicoId) : [...prev, servicoId]
    );
  }

  async function salvarRegistro() {
    const clienteId = formRegistro.clienteId?.trim() ?? "";
    const itensParaSalvar = formRegistro.mensalidades
      .map((row) => ({
        valor: parseValorReais(row.valorDigitado),
        vencimento: ultimoDiaDoMes(row.mes, row.ano),
        descricao: row.descricao.trim() || undefined,
      }))
      .filter((x) => x.valor > 0 && x.vencimento);
    if (!clienteId || itensParaSalvar.length === 0) {
      setErro("Selecione o cliente e informe ao menos um mês com valor.");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      for (const item of itensParaSalvar) {
        const basePayload = isMockEnabled()
          ? {
              clienteId,
              valor: item.valor,
              vencimento: item.vencimento,
              descricao: item.descricao,
            }
          : normalizeInadimplenciaToApi({
              clienteId,
              valor: item.valor,
              vencimento: item.vencimento,
              descricao: item.descricao,
            });
        await api.post("/api/inadimplentes", basePayload);
      }
      invalidateDashboard();
      navigate("/inadimplentes", {
        state: { mensagemSucesso: "Inadimplência(s) registrada(s) com sucesso." },
      });
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao registrar inadimplência"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="page-inadimplentes page-inadimplentes--registro">
      <Link to="/inadimplentes" className="page-inadimplentes-honorarios__voltar">
        <ArrowLeftIcon />
        Voltar para inadimplentes
      </Link>

      <header className="registro-inadimplencia__header">
        <p className="page-inadimplentes__contexto">Sistema de Gestão de Inadimplentes</p>
        <h1 className="page-inadimplentes__title">Registro de Inadimplência</h1>
        <p className="page-inadimplentes__subtitle">
          Cadastre os honorários em aberto do cliente. Cada linha representa um período de referência.
        </p>
      </header>

      {erro && <p className="page-inadimplentes__erro registro-inadimplencia__erro">{erro}</p>}

      <div className="registro-inadimplencia__layout">
        <div className="registro-inadimplencia__principal">
          <section className="registro-inadimplencia__card">
            <div className="registro-inadimplencia__card-head">
              <span className="registro-inadimplencia__step">1</span>
              <div>
                <h2 className="registro-inadimplencia__card-title">Cliente</h2>
                <p className="registro-inadimplencia__card-desc">Busque e selecione quem possui a dívida.</p>
              </div>
            </div>

            <label className="registro-inadimplencia__label" htmlFor="cliente-input-registro">
              Nome do cliente <span className="registro-inadimplencia__required">*</span>
            </label>
            <div className="registro-inadimplencia__combobox">
              <SearchIcon />
              <input
                ref={clienteInputRef}
                id="cliente-input-registro"
                type="text"
                autoComplete="off"
                placeholder="Digite para buscar o cliente..."
                value={clienteDropdownAberto ? clienteBusca : clienteSelecionado ? clienteSelecionado.nome : clienteBusca}
                onChange={(e) => {
                  const v = e.target.value;
                  setClienteBusca(v);
                  setClienteDropdownAberto(true);
                  const encontrado = clientes.find((c) => c.nome.toLowerCase() === v.trim().toLowerCase());
                  setFormRegistro((prev) => ({ ...prev, clienteId: encontrado?.id ?? "" }));
                }}
                onFocus={() => {
                  setClienteDropdownAberto(true);
                  if (clienteSelecionado && clienteBusca !== clienteSelecionado.nome) {
                    setClienteBusca(clienteSelecionado.nome);
                  }
                }}
                onBlur={() => setTimeout(() => setClienteDropdownAberto(false), 150)}
                className="registro-inadimplencia__input"
                aria-expanded={clienteDropdownAberto}
                aria-haspopup="listbox"
                aria-controls="cliente-listbox-registro"
              />
              {clienteDropdownAberto && (
                <ul
                  id="cliente-listbox-registro"
                  className="registro-inadimplencia__listbox"
                  role="listbox"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {clientesFiltrados.length === 0 ? (
                    <li className="registro-inadimplencia__listbox-vazio">Nenhum cliente encontrado</li>
                  ) : (
                    clientesFiltrados.map((c) => (
                      <li
                        key={c.id ?? ""}
                        role="option"
                        aria-selected={formRegistro.clienteId === c.id}
                        className={`registro-inadimplencia__opcao${formRegistro.clienteId === c.id ? " registro-inadimplencia__opcao--ativa" : ""}`}
                        onMouseDown={() => {
                          setFormRegistro((prev) => ({ ...prev, clienteId: c.id ?? "" }));
                          setClienteBusca(c.nome);
                          setClienteDropdownAberto(false);
                          clienteInputRef.current?.blur();
                        }}
                      >
                        <span className="registro-inadimplencia__opcao-nome">{c.nome}</span>
                        {c.cpf && <span className="registro-inadimplencia__opcao-doc">{formatCpfCnpj(c.cpf)}</span>}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            {clienteSelecionado && (
              <div className="registro-inadimplencia__cliente-info">
                <span className="registro-inadimplencia__cliente-info-nome">{clienteSelecionado.nome}</span>
                {clienteSelecionado.cpf && (
                  <span>{formatCpfCnpj(clienteSelecionado.cpf)}</span>
                )}
                {clienteSelecionado.email && <span>{clienteSelecionado.email}</span>}
              </div>
            )}
          </section>

          <section className="registro-inadimplencia__card">
            <div className="registro-inadimplencia__card-head registro-inadimplencia__card-head--split">
              <div className="registro-inadimplencia__card-head-main">
                <span className="registro-inadimplencia__step">2</span>
                <div>
                  <h2 className="registro-inadimplencia__card-title">Honorários em aberto</h2>
                  <p className="registro-inadimplencia__card-desc">
                    Informe mês, ano, valor e descrição de cada período pendente.
                  </p>
                </div>
              </div>
              <button type="button" className="btn btn--secondary btn--small" onClick={adicionarMensalidade}>
                <PlusIcon /> Adicionar período
              </button>
            </div>

            <div className="registro-inadimplencia__tabela-wrap">
              <table className="registro-inadimplencia__tabela">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Ano</th>
                    <th>Valor (R$)</th>
                    <th className="registro-inadimplencia__th-acao">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {formRegistro.mensalidades.map((row, index) => (
                    <Fragment key={row.rowId}>
                      <tr>
                        <td>
                          <select
                            value={row.mes}
                            onChange={(e) => atualizarMensalidade(index, "mes", e.target.value)}
                            className="registro-inadimplencia__select"
                            aria-label={`Mês da linha ${index + 1}`}
                          >
                            {MESES.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={row.ano}
                            onChange={(e) => atualizarMensalidade(index, "ano", e.target.value)}
                            className="registro-inadimplencia__select registro-inadimplencia__select--ano"
                            aria-label={`Ano da linha ${index + 1}`}
                          >
                            {ANOS.map((a) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="registro-inadimplencia__valor-cell">
                            <input
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              placeholder="0,00"
                              value={row.valorDigitado}
                              onChange={(e) => atualizarMensalidade(index, "valorDigitado", e.target.value ?? "")}
                              className="registro-inadimplencia__input registro-inadimplencia__input--valor"
                              aria-label={`Valor da linha ${index + 1}`}
                            />
                            {!isMockEnabled() && servicos.length > 0 && (
                              <button
                                type="button"
                                className="registro-inadimplencia__btn-servicos"
                                onClick={() => abrirModalServicosParaValor(index)}
                                title="Somar valor a partir dos serviços cadastrados"
                                aria-label="Adicionar valor a partir dos serviços"
                              >
                                <LayersIcon />
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="registro-inadimplencia__btn-remover"
                            onClick={() => removerMensalidade(index)}
                            disabled={formRegistro.mensalidades.length <= 1}
                            aria-label="Remover período"
                            title="Remover período"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                      <tr className="registro-inadimplencia__linha-descricao">
                        <td colSpan={4}>
                          <label className="registro-inadimplencia__descricao-label" htmlFor={`descricao-${row.rowId}`}>
                            Descrição do período
                            <span className="registro-inadimplencia__descricao-opcional"> (opcional)</span>
                          </label>
                          <input
                            id={`descricao-${row.rowId}`}
                            type="text"
                            placeholder={`Ex.: Honorários contábeis de ${MESES.find((m) => m.value === row.mes)?.label ?? "referência"}/${row.ano}`}
                            value={row.descricao}
                            onChange={(e) => atualizarMensalidade(index, "descricao", e.target.value)}
                            className="registro-inadimplencia__input registro-inadimplencia__input--descricao"
                          />
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="registro-inadimplencia__sidebar">
          <div className="registro-inadimplencia__resumo">
            <h3 className="registro-inadimplencia__resumo-titulo">Resumo do registro</h3>

            <dl className="registro-inadimplencia__resumo-lista">
              <div className="registro-inadimplencia__resumo-item">
                <dt>Cliente</dt>
                <dd>{clienteSelecionado?.nome ?? "—"}</dd>
              </div>
              <div className="registro-inadimplencia__resumo-item">
                <dt>Períodos com valor</dt>
                <dd>{qtdPeriodosComValor}</dd>
              </div>
              <div className="registro-inadimplencia__resumo-item registro-inadimplencia__resumo-item--total">
                <dt>Total em aberto</dt>
                <dd>{totalMensalidades.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd>
              </div>
            </dl>

            <div className="registro-inadimplencia__acoes">
              <button
                type="button"
                className="btn btn--primary registro-inadimplencia__btn-salvar"
                onClick={() => void salvarRegistro()}
                disabled={salvando}
              >
                {salvando ? "Salvando…" : "Salvar registro"}
              </button>
              <button
                type="button"
                className="btn btn--secondary registro-inadimplencia__btn-cancelar"
                onClick={() => navigate("/inadimplentes")}
                disabled={salvando}
              >
                Cancelar
              </button>
            </div>
          </div>
        </aside>
      </div>

      {modalServicosValorRowIndex !== null &&
        createPortal(
          <div className="modal-overlay" onClick={() => setModalServicosValorRowIndex(null)}>
            <div className="modal modal--cadastro modal--servicos-valor" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal__titulo">Selecionar serviços</h2>
              <p className="modal__servicos-valor-desc">
                Marque os serviços prestados. O valor será somado e aplicado ao período selecionado.
              </p>
              {loadingServicos ? (
                <p className="modal__servicos-status">Carregando serviços...</p>
              ) : (
                <>
                  <input
                    type="text"
                    className="modal__input modal__input--full"
                    placeholder="Pesquisar serviço..."
                    value={servicosBuscaValor}
                    onChange={(e) => setServicosBuscaValor(e.target.value)}
                    aria-label="Pesquisar serviço"
                  />
                  <div className="modal__servicos-list modal__servicos-list--valor">
                    {servicos
                      .filter((s) => s.ativo ?? true)
                      .filter((s) => {
                        const termo = servicosBuscaValor.trim().toLowerCase();
                        if (!termo) return true;
                        const nome = (s.nome ?? "").toLowerCase();
                        const descricao = (s.descricao ?? "").toLowerCase();
                        return nome.includes(termo) || descricao.includes(termo);
                      })
                      .map((s) => {
                        const valorReais = s.valorPadrao ?? 0;
                        const checked = servicosSelecionadosParaValor.includes(s.servicoId);
                        return (
                          <label key={s.servicoId || s.nome} className="modal__servico-item modal__servico-item--valor">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleServicoParaValor(s.servicoId)}
                            />
                            <span className="modal__servico-nome">{s.nome}</span>
                            <span className="modal__servico-valor">
                              {valorReais > 0
                                ? valorReais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                                : "—"}
                            </span>
                          </label>
                        );
                      })}
                    {servicos
                      .filter((s) => s.ativo ?? true)
                      .filter((s) => {
                        const termo = servicosBuscaValor.trim().toLowerCase();
                        if (!termo) return true;
                        const nome = (s.nome ?? "").toLowerCase();
                        const descricao = (s.descricao ?? "").toLowerCase();
                        return nome.includes(termo) || descricao.includes(termo);
                      }).length === 0 && (
                      <p className="modal__servicos-status">Nenhum serviço encontrado para a busca informada.</p>
                    )}
                  </div>
                </>
              )}
              <p className="modal__total-label modal__total-label--servicos">
                Total:{" "}
                <strong>{somaServicosModalReais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
              </p>
              <div className="modal__botoes">
                <button type="button" className="btn btn--secondary" onClick={() => setModalServicosValorRowIndex(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn--primary" onClick={aplicarServicosAoValor}>
                  Aplicar ao valor
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
