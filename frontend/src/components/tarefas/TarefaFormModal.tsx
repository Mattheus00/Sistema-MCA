import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, getAuthUserDisplay, normalizeListResponse } from "@/lib/api";
import { normalizeClienteFromApi } from "@/lib/apiNormalizers";
import { labelPrioridadeTarefa, labelStatusTarefa, STATUS_KANBAN } from "@/lib/tarefasUtils";
import type { Cliente } from "@/types/api";
import type {
  CriarTarefaPayload,
  PrioridadeTarefa,
  ResponsavelTarefa,
  StatusTarefa,
  TarefaDetalhe,
} from "@/types/tarefas";

type TarefaFormModalProps = {
  aberto: boolean;
  modo: "criar" | "editar";
  tarefa?: TarefaDetalhe | null;
  responsaveis: ResponsavelTarefa[];
  podeEscolherResponsavel: boolean;
  salvando: boolean;
  onFechar: () => void;
  onSalvar: (payload: CriarTarefaPayload) => Promise<void>;
};

type FormState = {
  titulo: string;
  descricao: string;
  responsavelId: string;
  status: StatusTarefa;
  prioridade: PrioridadeTarefa;
  clienteId: string;
  clienteBusca: string;
  dataInicio: string;
  dataVencimento: string;
  observacoes: string;
};

type FieldErrors = {
  titulo?: string;
  responsavelId?: string;
};

type ChecklistDraftItem = {
  id: string;
  texto: string;
};

function formInicial(): FormState {
  return {
    titulo: "",
    descricao: "",
    responsavelId: "",
    status: "A_FAZER",
    prioridade: "MEDIA",
    clienteId: "",
    clienteBusca: "",
    dataInicio: "",
    dataVencimento: "",
    observacoes: "",
  };
}

function formFromTarefa(t: TarefaDetalhe): FormState {
  const clienteNome = t.categoria?.trim() ?? "";
  return {
    titulo: t.titulo,
    descricao: t.descricao ?? "",
    responsavelId: t.responsavelId ?? "",
    status: t.status === "BACKLOG" ? "A_FAZER" : t.status,
    prioridade: t.prioridade,
    clienteId: clienteNome ? `__atual__:${clienteNome}` : "",
    clienteBusca: clienteNome,
    dataInicio: t.dataInicio?.split("T")[0] ?? "",
    dataVencimento: t.dataVencimento?.split("T")[0] ?? "",
    observacoes: t.observacoes ?? "",
  };
}

function Label({ required, children }: { required?: boolean; children: React.ReactNode }) {
  return (
    <span className="tarefas-form__label">
      {children}
      {required && (
        <span className="tarefas-form__req" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </span>
  );
}

function IconFechar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconCalendario() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconLixeira() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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

export default function TarefaFormModal({
  aberto,
  modo,
  tarefa,
  responsaveis,
  podeEscolherResponsavel,
  salvando,
  onFechar,
  onSalvar,
}: TarefaFormModalProps) {
  const tituloId = useId();
  const [form, setForm] = useState<FormState>(formInicial());
  const [erros, setErros] = useState<FieldErrors>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [checklistItens, setChecklistItens] = useState<ChecklistDraftItem[]>([]);
  const [novoItem, setNovoItem] = useState("");
  const [listaClientes, setListaClientes] = useState<Cliente[]>([]);
  const [clienteListaAberta, setClienteListaAberta] = useState(false);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const clienteComboRef = useRef<HTMLDivElement>(null);
  const nomeUsuarioAtual = getAuthUserDisplay() || "Você";

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
    setErros({});
    setErroGeral(null);
    setNovoItem("");
    setChecklistItens([]);
    setClienteListaAberta(false);
    setListaClientes([]);
    setForm(modo === "editar" && tarefa ? formFromTarefa(tarefa) : formInicial());
  }, [aberto, modo, tarefa]);

  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto || !clienteListaAberta) return;
    const delay = form.clienteBusca.trim() && !form.clienteId ? 300 : 0;
    const timer = setTimeout(() => {
      void carregarClientes(form.clienteId ? "" : form.clienteBusca);
    }, delay);
    return () => clearTimeout(timer);
  }, [aberto, clienteListaAberta, form.clienteBusca, form.clienteId, carregarClientes]);

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

  function atualizarCampo<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [campo]: valor };
      if (campo === "dataInicio" && typeof valor === "string" && next.dataVencimento && valor && next.dataVencimento < valor) {
        next.dataVencimento = valor;
      }
      return next;
    });
    if (campo === "titulo" || campo === "responsavelId") {
      setErros((prev) => {
        if (campo === "titulo" && prev.titulo) {
          const { titulo: _, ...rest } = prev;
          return rest;
        }
        if (campo === "responsavelId" && prev.responsavelId) {
          const { responsavelId: _, ...rest } = prev;
          return rest;
        }
        return prev;
      });
    }
  }

  function adicionarChecklistItem() {
    const texto = novoItem.trim();
    if (!texto) return;
    setChecklistItens((itens) => [...itens, { id: `${Date.now()}-${itens.length}`, texto }]);
    setNovoItem("");
  }

  function removerChecklistItem(id: string) {
    setChecklistItens((itens) => itens.filter((item) => item.id !== id));
  }

  function editarChecklistItem(id: string, texto: string) {
    setChecklistItens((itens) => itens.map((item) => (item.id === id ? { ...item, texto } : item)));
  }

  function moverChecklistItem(index: number, direcao: -1 | 1) {
    setChecklistItens((itens) => {
      const destino = index + direcao;
      if (destino < 0 || destino >= itens.length) return itens;
      const copia = [...itens];
      const [item] = copia.splice(index, 1);
      copia.splice(destino, 0, item);
      return copia;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErroGeral(null);

    const proximosErros: FieldErrors = {};
    if (!form.titulo.trim()) {
      proximosErros.titulo = "Informe um título para a tarefa.";
    }
    if (podeEscolherResponsavel && !form.responsavelId) {
      proximosErros.responsavelId = "Selecione um responsável.";
    }
    if (Object.keys(proximosErros).length > 0) {
      setErros(proximosErros);
      return;
    }
    setErros({});

    const payload: CriarTarefaPayload = {
      titulo: form.titulo.trim(),
      status: form.status,
      prioridade: form.prioridade,
    };
    if (form.descricao.trim()) payload.descricao = form.descricao.trim();
    if (podeEscolherResponsavel && form.responsavelId) payload.responsavelId = form.responsavelId;
    if (form.clienteId && form.clienteBusca.trim()) payload.categoria = form.clienteBusca.trim();
    if (form.dataInicio) payload.dataInicio = form.dataInicio;
    if (form.dataVencimento) payload.dataVencimento = form.dataVencimento;
    if (form.observacoes.trim()) payload.observacoes = form.observacoes.trim();
    if (modo === "criar") {
      const itens = checklistItens.map((item) => item.texto.trim()).filter(Boolean);
      if (itens.length > 0) payload.checklistItens = itens;
    }

    try {
      await onSalvar(payload);
    } catch (err: unknown) {
      setErroGeral(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  const modal = (
    <div className="modal-overlay" onClick={() => !salvando && onFechar()}>
      <div
        className="tarefas-form"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
      >
        <header className="tarefas-form__header">
          <div>
            <h2 id={tituloId} className="tarefas-form__titulo">
              {modo === "criar" ? "Nova tarefa" : "Editar tarefa"}
            </h2>
            <p className="tarefas-form__subtitulo">
              {modo === "criar"
                ? "Crie uma tarefa, defina responsável, prioridade e prazo."
                : "Atualize as informações da tarefa."}
            </p>
          </div>
          <button
            type="button"
            className="tarefas-form__fechar"
            onClick={onFechar}
            disabled={salvando}
            aria-label="Fechar"
          >
            <IconFechar />
          </button>
        </header>

        {erroGeral && (
          <p className="tarefas-form__erro-geral" role="alert">
            {erroGeral}
          </p>
        )}

        <form className="tarefas-form__form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="tarefas-form__body">
            <section className="tarefas-form__secao">
              <h3 className="tarefas-form__secao-titulo">Informações principais</h3>
              <div className="tarefas-form__grid">
                <label className="tarefas-form__campo tarefas-form__campo--full tarefas-form__campo--destaque">
                  <Label required>Título</Label>
                  <input
                    className={`tarefas-form__input${erros.titulo ? " tarefas-form__input--erro" : ""}`}
                    value={form.titulo}
                    onChange={(e) => atualizarCampo("titulo", e.target.value)}
                    placeholder="Ex.: Validar proposta do cliente"
                    autoFocus
                  />
                  {erros.titulo && <span className="tarefas-form__erro-campo">{erros.titulo}</span>}
                </label>

                <label className="tarefas-form__campo tarefas-form__campo--full">
                  <Label>Descrição</Label>
                  <textarea
                    className="tarefas-form__input tarefas-form__textarea"
                    rows={3}
                    value={form.descricao}
                    onChange={(e) => atualizarCampo("descricao", e.target.value)}
                    placeholder="Descreva o objetivo e o contexto da tarefa..."
                  />
                </label>
              </div>
            </section>

            <section className="tarefas-form__secao">
              <h3 className="tarefas-form__secao-titulo">Organização</h3>
              <div className="tarefas-form__grid">
                <label className="tarefas-form__campo tarefas-form__campo--destaque">
                  <Label required={podeEscolherResponsavel}>Responsável</Label>
                  {podeEscolherResponsavel ? (
                    <select
                      className={`tarefas-form__input tarefas-form__select${erros.responsavelId ? " tarefas-form__input--erro" : ""}`}
                      value={form.responsavelId}
                      onChange={(e) => atualizarCampo("responsavelId", e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {responsaveis.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="tarefas-form__input tarefas-form__input--readonly"
                      value={tarefa?.responsavelNome || nomeUsuarioAtual}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                  {erros.responsavelId && <span className="tarefas-form__erro-campo">{erros.responsavelId}</span>}
                </label>

                <label className="tarefas-form__campo">
                  <Label>Status</Label>
                  <select
                    className="tarefas-form__input tarefas-form__select"
                    value={form.status}
                    onChange={(e) => atualizarCampo("status", e.target.value as StatusTarefa)}
                  >
                    {STATUS_KANBAN.map((s) => (
                      <option key={s} value={s}>
                        {labelStatusTarefa(s)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="tarefas-form__campo">
                  <Label>Prioridade</Label>
                  <select
                    className="tarefas-form__input tarefas-form__select"
                    value={form.prioridade}
                    onChange={(e) => atualizarCampo("prioridade", e.target.value as PrioridadeTarefa)}
                  >
                    {(["BAIXA", "MEDIA", "ALTA"] as PrioridadeTarefa[]).map((p) => (
                      <option key={p} value={p}>
                        {labelPrioridadeTarefa(p)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="tarefas-form__campo" ref={clienteComboRef}>
                  <Label>Cliente</Label>
                  <div
                    className={`lc-modal-form__combo${clienteListaAberta ? " lc-modal-form__combo--aberta" : ""}${form.clienteId ? " lc-modal-form__combo--selecionado" : ""}`}
                  >
                    <div className="lc-modal-form__busca">
                      <span className="lc-modal-form__busca-icone">
                        <IconBusca />
                      </span>
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
                        aria-expanded={clienteListaAberta}
                        aria-controls="tarefas-form-clientes-lista"
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

                    <div className="lc-modal-form__combo-panel" aria-hidden={!clienteListaAberta}>
                      <ul id="tarefas-form-clientes-lista" className="lc-modal-form__sugestoes" role="listbox">
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
                                <span className="lc-modal-form__sugestao-meta">
                                  {c.codigo ? `Cód. ${c.codigo}` : null}
                                  {c.codigo && c.cpf ? " · " : null}
                                  {c.cpf ? c.cpf : null}
                                </span>
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="tarefas-form__secao">
              <h3 className="tarefas-form__secao-titulo">Prazo</h3>
              <div className="tarefas-form__grid">
                <label className="tarefas-form__campo">
                  <Label>Data de início</Label>
                  <div className="tarefas-form__date-wrap">
                    <span className="tarefas-form__date-icone" aria-hidden="true">
                      <IconCalendario />
                    </span>
                    <input
                      type="date"
                      className="tarefas-form__input tarefas-form__input--date"
                      value={form.dataInicio}
                      onChange={(e) => atualizarCampo("dataInicio", e.target.value)}
                    />
                  </div>
                </label>

                <label className="tarefas-form__campo tarefas-form__campo--destaque">
                  <Label>Prazo</Label>
                  <div className="tarefas-form__date-wrap">
                    <span className="tarefas-form__date-icone" aria-hidden="true">
                      <IconCalendario />
                    </span>
                    <input
                      type="date"
                      className="tarefas-form__input tarefas-form__input--date"
                      value={form.dataVencimento}
                      min={form.dataInicio || undefined}
                      onChange={(e) => atualizarCampo("dataVencimento", e.target.value)}
                    />
                  </div>
                </label>
              </div>
            </section>

            <section className="tarefas-form__secao">
              <h3 className="tarefas-form__secao-titulo">Complementos</h3>
              <div className="tarefas-form__grid">
                <label className="tarefas-form__campo tarefas-form__campo--full">
                  <Label>Observações</Label>
                  <textarea
                    className="tarefas-form__input tarefas-form__textarea tarefas-form__textarea--curto"
                    rows={2}
                    value={form.observacoes}
                    onChange={(e) => atualizarCampo("observacoes", e.target.value)}
                    placeholder="Adicione informações adicionais, instruções ou contexto..."
                  />
                </label>

                {modo === "criar" && (
                  <div className="tarefas-form__campo tarefas-form__campo--full">
                    <span className="tarefas-form__label">Checklist</span>
                    <p className="tarefas-form__hint">
                      Você poderá marcar os itens como concluídos após criar a tarefa.
                    </p>

                    <div className="tarefas-form__check-add">
                      <input
                        className="tarefas-form__input"
                        value={novoItem}
                        onChange={(e) => setNovoItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            adicionarChecklistItem();
                          }
                        }}
                        placeholder="Adicionar item ao checklist..."
                      />
                      <button
                        type="button"
                        className="tarefas-form__check-btn"
                        onClick={adicionarChecklistItem}
                        disabled={!novoItem.trim()}
                      >
                        + Adicionar
                      </button>
                    </div>

                    {checklistItens.length > 0 && (
                      <ul className="tarefas-form__check-lista">
                        {checklistItens.map((item, index) => (
                          <li key={item.id} className="tarefas-form__check-item">
                            <span className="tarefas-form__check-box" aria-hidden="true" />
                            <input
                              className="tarefas-form__check-texto"
                              value={item.texto}
                              onChange={(e) => editarChecklistItem(item.id, e.target.value)}
                              aria-label={`Item ${index + 1} do checklist`}
                            />
                            <div className="tarefas-form__check-acoes">
                              <button
                                type="button"
                                className="tarefas-form__check-acao"
                                onClick={() => moverChecklistItem(index, -1)}
                                disabled={index === 0}
                                aria-label="Mover para cima"
                                title="Mover para cima"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="tarefas-form__check-acao"
                                onClick={() => moverChecklistItem(index, 1)}
                                disabled={index === checklistItens.length - 1}
                                aria-label="Mover para baixo"
                                title="Mover para baixo"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className="tarefas-form__check-acao tarefas-form__check-acao--remover"
                                onClick={() => removerChecklistItem(item.id)}
                                aria-label="Remover item"
                                title="Remover"
                              >
                                <IconLixeira />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          <footer className="tarefas-form__footer">
            <button type="button" className="btn btn--secondary" onClick={onFechar} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={salvando}>
              {salvando
                ? modo === "criar"
                  ? "Criando..."
                  : "Salvando..."
                : modo === "criar"
                  ? "Criar tarefa"
                  : "Salvar alterações"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
