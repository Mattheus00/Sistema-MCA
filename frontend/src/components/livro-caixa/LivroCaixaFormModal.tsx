import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, normalizeListResponse } from "@/lib/api";
import { normalizeClienteFromApi } from "@/lib/apiNormalizers";
import { formatarReaisParaInput, parseValorReais } from "@/lib/valorBrasil";
import {
  FORMAS_PAGAMENTO,
  hojeIso,
  isCategoriaHonorariosContabeis,
  labelFormaPagamento,
  labelStatusMovimentacao,
  labelTipoMovimentacao,
  statusPermitidosPorTipo,
} from "@/lib/livroCaixaUtils";
import type {
  CategoriaLivroCaixa,
  ContaLivroCaixa,
  CriarMovimentacaoPayload,
  FormaPagamento,
  MovimentacaoDetalhe,
  StatusMovimentacao,
  TipoMovimentacao,
} from "@/types/livroCaixa";
import type { Cliente } from "@/types/api";

export type FormMovimentacaoState = {
  tipo: TipoMovimentacao;
  descricao: string;
  valorInput: string;
  categoriaId: string;
  clienteId: string;
  clienteBusca: string;
  dataMovimentacao: string;
  dataVencimento: string;
  dataPagamento: string;
  status: StatusMovimentacao;
  formaPagamento: FormaPagamento | "";
  contaId: string;
  observacao: string;
  fornecedor: string;
};

function formInicial(): FormMovimentacaoState {
  return {
    tipo: "ENTRADA",
    descricao: "",
    valorInput: "",
    categoriaId: "",
    clienteId: "",
    clienteBusca: "",
    dataMovimentacao: hojeIso(),
    dataVencimento: "",
    dataPagamento: "",
    status: "PREVISTO",
    formaPagamento: "",
    contaId: "",
    observacao: "",
    fornecedor: "",
  };
}

function formFromDetalhe(m: MovimentacaoDetalhe): FormMovimentacaoState {
  return {
    tipo: m.tipo,
    descricao: m.descricao,
    valorInput: formatarReaisParaInput(m.valor),
    categoriaId: m.categoriaId ?? "",
    clienteId: m.clienteId ?? "",
    clienteBusca: m.clienteNome ?? "",
    dataMovimentacao: m.dataMovimentacao?.split("T")[0] ?? hojeIso(),
    dataVencimento: m.dataVencimento?.split("T")[0] ?? "",
    dataPagamento: m.dataPagamento?.split("T")[0] ?? "",
    status: m.status,
    formaPagamento: m.formaPagamento ?? "",
    contaId: m.contaId ?? "",
    observacao: m.observacao ?? "",
    fornecedor: m.fornecedor ?? "",
  };
}

function Label({ required, children }: { required?: boolean; children: React.ReactNode }) {
  return (
    <span className="lc-modal-form__label">
      {children}
      {required && <span className="lc-modal-form__req" aria-hidden="true"> *</span>}
    </span>
  );
}

function IconDados() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function IconDatas() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconPagamento() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconCliente() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconEntrada() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="16 12 12 8 8 12" />
      <line x1="12" y1="16" x2="12" y2="8" />
    </svg>
  );
}

function IconSaida() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="8 12 12 16 16 12" />
      <line x1="12" y1="8" x2="12" y2="16" />
    </svg>
  );
}

function IconBusca() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

type LivroCaixaFormModalProps = {
  aberto: boolean;
  modo: "criar" | "editar";
  movimentacao?: MovimentacaoDetalhe | null;
  categorias: CategoriaLivroCaixa[];
  contas: ContaLivroCaixa[];
  salvando: boolean;
  onFechar: () => void;
  onSalvar: (payload: CriarMovimentacaoPayload) => Promise<void>;
};

export default function LivroCaixaFormModal({
  aberto,
  modo,
  movimentacao,
  categorias,
  contas,
  salvando,
  onFechar,
  onSalvar,
}: LivroCaixaFormModalProps) {
  const [form, setForm] = useState<FormMovimentacaoState>(formInicial());
  const [erro, setErro] = useState<string | null>(null);
  const [listaClientes, setListaClientes] = useState<Cliente[]>([]);
  const [clienteListaAberta, setClienteListaAberta] = useState(false);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const clienteComboRef = useRef<HTMLDivElement>(null);

  const carregarClientes = useCallback(async (termo: string) => {
    setCarregandoClientes(true);
    try {
      const params: Record<string, string | number> = {
        page: 0,
        size: 50,
        statusCliente: "ATIVO",
      };
      if (termo.trim()) params.termo = termo.trim();
      const r = await api.get("/api/clientes", { params });
      setListaClientes(normalizeListResponse<Record<string, unknown>>(r.data).map(normalizeClienteFromApi));
    } catch {
      setListaClientes([]);
    } finally {
      setCarregandoClientes(false);
    }
  }, []);

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setClienteListaAberta(false);
    if (modo === "editar" && movimentacao) {
      setForm(formFromDetalhe(movimentacao));
    } else {
      setForm(formInicial());
    }
  }, [aberto, modo, movimentacao]);

  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto || !isCategoriaHonorariosContabeis(form.categoriaId, categorias)) {
      setListaClientes([]);
      setClienteListaAberta(false);
      return;
    }
    const delay = form.clienteBusca.trim() ? 300 : 0;
    const timer = setTimeout(() => {
      void carregarClientes(form.clienteBusca);
    }, delay);
    return () => clearTimeout(timer);
  }, [aberto, form.categoriaId, form.clienteBusca, categorias, carregarClientes]);

  useEffect(() => {
    if (!clienteListaAberta) return;
    function handleClickFora(e: MouseEvent) {
      if (clienteComboRef.current && !clienteComboRef.current.contains(e.target as Node)) {
        setClienteListaAberta(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [clienteListaAberta]);

  if (!aberto) return null;

  const categoriasFiltradas = categorias.filter((c) => c.tipo === form.tipo && c.ativa);
  const statusOpcoes = statusPermitidosPorTipo(form.tipo);
  const exigeCliente = isCategoriaHonorariosContabeis(form.categoriaId, categorias);
  const titulo = modo === "criar" ? "Nova movimentação" : "Editar movimentação";
  const subtitulo = modo === "criar" ? "Preencha os dados da entrada ou saída" : "Atualize os dados da movimentação";

  function atualizarTipo(tipo: TipoMovimentacao) {
    setForm((f) => ({
      ...f,
      tipo,
      categoriaId: "",
      clienteId: "",
      clienteBusca: "",
      status: statusPermitidosPorTipo(tipo)[0],
    }));
  }

  function atualizarCategoria(categoriaId: string) {
    setForm((f) => {
      const exige = isCategoriaHonorariosContabeis(categoriaId, categorias);
      return {
        ...f,
        categoriaId,
        ...(exige ? {} : { clienteId: "", clienteBusca: "" }),
      };
    });
    if (isCategoriaHonorariosContabeis(categoriaId, categorias)) {
      setClienteListaAberta(true);
    } else {
      setClienteListaAberta(false);
    }
  }

  function selecionarCliente(cliente: Cliente) {
    setForm((f) => ({
      ...f,
      clienteId: String(cliente.id),
      clienteBusca: cliente.nome,
    }));
    setClienteListaAberta(false);
  }

  function limparClienteSelecionado() {
    setForm((f) => ({ ...f, clienteId: "", clienteBusca: "" }));
    setClienteListaAberta(true);
    void carregarClientes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const valor = parseValorReais(form.valorInput);
    if (!form.descricao.trim()) {
      setErro("Informe a descrição.");
      return;
    }
    if (valor <= 0) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    if (!form.categoriaId) {
      setErro("Selecione uma categoria.");
      return;
    }
    if (!form.dataMovimentacao) {
      setErro("Informe a data da movimentação.");
      return;
    }
    if (exigeCliente && !form.clienteId) {
      setErro("Selecione o cliente para honorários contábeis.");
      return;
    }
    const payload: CriarMovimentacaoPayload = {
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      valor,
      categoriaId: form.categoriaId,
      dataMovimentacao: form.dataMovimentacao,
      status: form.status,
    };
    if (form.clienteId) payload.clienteId = form.clienteId;
    if (form.dataVencimento) payload.dataVencimento = form.dataVencimento;
    if (form.dataPagamento) payload.dataPagamento = form.dataPagamento;
    if (form.formaPagamento) payload.formaPagamento = form.formaPagamento;
    if (form.contaId) payload.contaId = form.contaId;
    if (form.observacao.trim()) payload.observacao = form.observacao.trim();
    if (form.fornecedor.trim()) payload.fornecedor = form.fornecedor.trim();
    try {
      await onSalvar(payload);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  const modal = (
    <div className="modal-overlay" onClick={() => !salvando && onFechar()}>
      <div className="lc-modal-form" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="lc-modal-form-titulo">
        <header className="lc-modal-form__header">
          <div>
            <h2 id="lc-modal-form-titulo" className="lc-modal-form__titulo">{titulo}</h2>
            <p className="lc-modal-form__subtitulo">{subtitulo}</p>
          </div>
          <button type="button" className="lc-modal-form__fechar" onClick={onFechar} disabled={salvando} aria-label="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {erro && (
          <p className="lc-modal-form__erro" role="alert">
            {erro}
          </p>
        )}

        <form className="lc-modal-form__body" onSubmit={(e) => void handleSubmit(e)}>
          <section className="lc-modal-form__secao">
            <h3 className="lc-modal-form__secao-titulo">
              <span className="lc-modal-form__secao-icone"><IconDados /></span>
              Dados principais
            </h3>

            <div className="lc-modal-form__grid">
              <div className="lc-modal-form__campo lc-modal-form__campo--full">
                <Label required>Tipo</Label>
                <div className="lc-modal-form__tipo-grupo" role="group" aria-label="Tipo de movimentação">
                  <button
                    type="button"
                    className={`lc-modal-form__tipo-btn lc-modal-form__tipo-btn--entrada${form.tipo === "ENTRADA" ? " lc-modal-form__tipo-btn--ativa" : ""}`}
                    onClick={() => atualizarTipo("ENTRADA")}
                    aria-pressed={form.tipo === "ENTRADA"}
                  >
                    <IconEntrada />
                    {labelTipoMovimentacao("ENTRADA")}
                  </button>
                  <button
                    type="button"
                    className={`lc-modal-form__tipo-btn lc-modal-form__tipo-btn--saida${form.tipo === "SAIDA" ? " lc-modal-form__tipo-btn--ativa" : ""}`}
                    onClick={() => atualizarTipo("SAIDA")}
                    aria-pressed={form.tipo === "SAIDA"}
                  >
                    <IconSaida />
                    {labelTipoMovimentacao("SAIDA")}
                  </button>
                </div>
              </div>

              <label className="lc-modal-form__campo lc-modal-form__campo--full">
                <Label required>Descrição</Label>
                <input
                  className="lc-modal-form__input"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Digite a descrição da movimentação..."
                  maxLength={200}
                  required
                />
              </label>

              <label className="lc-modal-form__campo">
                <Label required>Valor (R$)</Label>
                <div className="lc-modal-form__money">
                  <span className="lc-modal-form__money-prefix">R$</span>
                  <input
                    className="lc-modal-form__input lc-modal-form__input--money"
                    inputMode="decimal"
                    value={form.valorInput}
                    onChange={(e) => setForm((f) => ({ ...f, valorInput: e.target.value }))}
                    placeholder="0,00"
                    required
                  />
                </div>
              </label>

              <label className="lc-modal-form__campo">
                <Label required>Categoria</Label>
                <select
                  className="lc-modal-form__input lc-modal-form__select"
                  value={form.categoriaId}
                  onChange={(e) => atualizarCategoria(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {categoriasFiltradas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </label>

              {exigeCliente && (
                <div className="lc-modal-form__campo lc-modal-form__campo--full lc-modal-form__busca-wrap" ref={clienteComboRef}>
                  <Label required>Cliente</Label>
                  <div className={`lc-modal-form__busca${clienteListaAberta ? " lc-modal-form__busca--aberta" : ""}${form.clienteId ? " lc-modal-form__busca--selecionado" : ""}`}>
                    <span className="lc-modal-form__busca-icone"><IconBusca /></span>
                    <input
                      className="lc-modal-form__input lc-modal-form__input--combo"
                      value={form.clienteBusca}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          clienteBusca: e.target.value,
                          clienteId: "",
                        }))
                      }
                      onFocus={() => {
                        setClienteListaAberta(true);
                        if (listaClientes.length === 0) void carregarClientes(form.clienteBusca);
                      }}
                      placeholder="Buscar cliente..."
                      autoComplete="off"
                      aria-required="true"
                      aria-expanded={clienteListaAberta}
                      aria-controls="lc-modal-clientes-lista"
                      aria-autocomplete="list"
                      role="combobox"
                    />
                    {form.clienteId && (
                      <button
                        type="button"
                        className="lc-modal-form__busca-limpar"
                        onClick={limparClienteSelecionado}
                        aria-label="Limpar cliente selecionado"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {clienteListaAberta && (
                    <ul id="lc-modal-clientes-lista" className="lc-modal-form__sugestoes" role="listbox">
                      {carregandoClientes ? (
                        <li className="lc-modal-form__sugestoes-status">Carregando clientes…</li>
                      ) : listaClientes.length === 0 ? (
                        <li className="lc-modal-form__sugestoes-status">Nenhum cliente encontrado.</li>
                      ) : (
                        listaClientes.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={form.clienteId === String(c.id)}
                              className={form.clienteId === String(c.id) ? "lc-modal-form__sugestao--ativa" : ""}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selecionarCliente(c)}
                            >
                              <strong>{c.nome}</strong>
                              {c.codigo ? <span>Cód. {c.codigo}</span> : null}
                              {c.cpf ? <span>{c.cpf}</span> : null}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              )}

              <label className="lc-modal-form__campo">
                <Label required>Status</Label>
                <select
                  className="lc-modal-form__input lc-modal-form__select"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StatusMovimentacao }))}
                >
                  {statusOpcoes.map((s) => (
                    <option key={s} value={s}>{labelStatusMovimentacao(s)}</option>
                  ))}
                </select>
              </label>

              <label className="lc-modal-form__campo">
                <Label required>Data movimentação</Label>
                <input
                  type="date"
                  className="lc-modal-form__input lc-modal-form__input--date"
                  value={form.dataMovimentacao}
                  onChange={(e) => setForm((f) => ({ ...f, dataMovimentacao: e.target.value }))}
                  required
                />
              </label>
            </div>
          </section>

          <section className="lc-modal-form__secao">
            <h3 className="lc-modal-form__secao-titulo">
              <span className="lc-modal-form__secao-icone"><IconDatas /></span>
              Datas
            </h3>
            <div className="lc-modal-form__grid">
              <label className="lc-modal-form__campo">
                <Label>Vencimento</Label>
                <input
                  type="date"
                  className="lc-modal-form__input lc-modal-form__input--date"
                  value={form.dataVencimento}
                  onChange={(e) => setForm((f) => ({ ...f, dataVencimento: e.target.value }))}
                />
              </label>
              <label className="lc-modal-form__campo">
                <Label>Data pagamento/recebimento</Label>
                <input
                  type="date"
                  className="lc-modal-form__input lc-modal-form__input--date"
                  value={form.dataPagamento}
                  onChange={(e) => setForm((f) => ({ ...f, dataPagamento: e.target.value }))}
                />
              </label>
            </div>
          </section>

          <section className="lc-modal-form__secao">
            <h3 className="lc-modal-form__secao-titulo">
              <span className="lc-modal-form__secao-icone"><IconPagamento /></span>
              Pagamento
            </h3>
            <div className="lc-modal-form__grid">
              <label className="lc-modal-form__campo">
                <Label>Forma de pagamento</Label>
                <select
                  className="lc-modal-form__input lc-modal-form__select"
                  value={form.formaPagamento}
                  onChange={(e) => setForm((f) => ({ ...f, formaPagamento: e.target.value as FormaPagamento | "" }))}
                >
                  <option value="">Selecione...</option>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>{labelFormaPagamento(f)}</option>
                  ))}
                </select>
              </label>
              <label className="lc-modal-form__campo">
                <Label>Conta</Label>
                <select
                  className="lc-modal-form__input lc-modal-form__select"
                  value={form.contaId}
                  onChange={(e) => setForm((f) => ({ ...f, contaId: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {contas.filter((c) => c.ativa).map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="lc-modal-form__secao">
            <h3 className="lc-modal-form__secao-titulo">
              <span className="lc-modal-form__secao-icone"><IconCliente /></span>
              {form.tipo === "SAIDA" ? "Fornecedor e observações" : "Observações"}
            </h3>
            <div className="lc-modal-form__grid">
              {form.tipo === "SAIDA" && (
                <label className="lc-modal-form__campo lc-modal-form__campo--full">
                  <Label>Fornecedor</Label>
                  <input
                    className="lc-modal-form__input"
                    value={form.fornecedor}
                    onChange={(e) => setForm((f) => ({ ...f, fornecedor: e.target.value }))}
                    placeholder="Nome do fornecedor..."
                  />
                </label>
              )}

              <label className="lc-modal-form__campo lc-modal-form__campo--full">
                <Label>Observação</Label>
                <textarea
                  className="lc-modal-form__input lc-modal-form__textarea"
                  rows={3}
                  value={form.observacao}
                  onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                  placeholder="Adicione observações sobre esta movimentação..."
                />
              </label>
            </div>
          </section>

          <footer className="lc-modal-form__footer">
            <button type="button" className="lc-modal-form__btn lc-modal-form__btn--cancelar" onClick={onFechar} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="lc-modal-form__btn lc-modal-form__btn--salvar" disabled={salvando}>
              {salvando ? "Salvando…" : modo === "criar" ? "Criar" : "Salvar"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
