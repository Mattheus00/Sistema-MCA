import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, getApiErrorMessage, normalizeListResponse } from "@/lib/api";
import { normalizeClienteFromApi } from "@/lib/apiNormalizers";
import {
  abrirArquivoDocumento,
  atualizarStatusDocumento,
  baixarArquivoDocumento,
  listarDocumentosClientes,
  obterDocumentoCliente,
  obterResumoDocumentosClientes,
  invalidateDocumentosClientesResumo,
  responderDocumento,
} from "@/lib/documentosClientesApi";
import {
  classeBadgeStatusDocumento,
  formatarDataDocumento,
  formatarTamanhoArquivo,
  labelStatusDocumentoCliente,
  labelTipoDocumentoCliente,
  truncarTexto,
} from "@/lib/documentosClientesUtils";
import type { Cliente, DocumentoCliente, ResumoDocumentosClientes, StatusDocumentoCliente, TipoDocumentoCliente } from "@/types/api";

const TIPOS: TipoDocumentoCliente[] = ["COMPROVANTE", "NOTA_FISCAL", "CONTRATO", "DECLARACAO", "OUTRO"];
const STATUS_CARDS: Array<{ status: StatusDocumentoCliente | ""; label: string; chave: keyof ResumoDocumentosClientes }> = [
  { status: "ENVIADO", label: "Novos", chave: "pendentes" },
  { status: "RECEBIDO", label: "Recebidos", chave: "recebidos" },
  { status: "EM_ANALISE", label: "Em análise", chave: "emAnalise" },
  { status: "ARQUIVADO", label: "Arquivados", chave: "arquivados" },
];

export default function WebDocumentosClientes() {
  const [resumo, setResumo] = useState<ResumoDocumentosClientes | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoCliente[]>([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);
  const [statusFiltro, setStatusFiltro] = useState<StatusDocumentoCliente | "">("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoDocumentoCliente | "">("");
  const [clienteId, setClienteId] = useState("");
  const [clienteBusca, setClienteBusca] = useState("");
  const [clientesSugestoes, setClientesSugestoes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<DocumentoCliente | null>(null);
  const [respostaTexto, setRespostaTexto] = useState("");
  const [statusDetalhe, setStatusDetalhe] = useState<StatusDocumentoCliente>("RECEBIDO");
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const buscaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregarResumo = useCallback(async () => {
    try {
      const data = await obterResumoDocumentosClientes();
      setResumo(data);
    } catch {
      /* resumo opcional no topo */
    }
  }, []);

  const carregarLista = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);
      const data = await listarDocumentosClientes({
        page: pagina,
        size: 20,
        status: statusFiltro,
        tipo: tipoFiltro || undefined,
        clienteId: clienteId || undefined,
      });
      setDocumentos(data.content);
      setTotalPaginas(Math.max(1, data.totalPages));
      setTotalElementos(data.totalElements);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Não foi possível carregar os documentos."));
    } finally {
      setLoading(false);
    }
  }, [pagina, statusFiltro, tipoFiltro, clienteId]);

  useEffect(() => {
    void carregarResumo();
  }, [carregarResumo]);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 4000);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  useEffect(() => {
    if (!detalhe) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [detalhe]);

  useEffect(() => {
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    if (!clienteBusca.trim()) {
      setClientesSugestoes([]);
      return;
    }
    buscaTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const r = await api.get("/api/clientes", {
            params: { termo: clienteBusca.trim(), page: 0, size: 20, statusCliente: "ATIVO" },
          });
          const list = normalizeListResponse<Record<string, unknown>>(r.data).map(normalizeClienteFromApi);
          setClientesSugestoes(list);
        } catch {
          setClientesSugestoes([]);
        }
      })();
    }, 300);
    return () => {
      if (buscaTimer.current) clearTimeout(buscaTimer.current);
    };
  }, [clienteBusca]);

  function aplicarFiltroStatus(status: StatusDocumentoCliente | "") {
    setStatusFiltro((atual) => (atual === status ? "" : status));
    setPagina(0);
  }

  function selecionarCliente(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setClienteId(String(cliente.id));
    setClienteBusca(cliente.nome);
    setClientesSugestoes([]);
    setPagina(0);
  }

  function limparCliente() {
    setClienteSelecionado(null);
    setClienteId("");
    setClienteBusca("");
    setClientesSugestoes([]);
    setPagina(0);
  }

  async function abrirDetalhe(id: string) {
    try {
      setCarregandoDetalhe(true);
      setFeedbackModal(null);
      setErro(null);
      const doc = await obterDocumentoCliente(id);
      setDetalhe(doc);
      setRespostaTexto(doc.respostaEscritorio ?? "");
      setStatusDetalhe(doc.status);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Não foi possível abrir o documento."));
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  function fecharDetalhe() {
    if (salvando) return;
    setDetalhe(null);
    setRespostaTexto("");
    setFeedbackModal(null);
    setErro(null);
  }

  function sincronizarDocumentoNaLista(atualizado: DocumentoCliente) {
    setDocumentos((lista) =>
      lista.map((d) => (d.documentoId === atualizado.documentoId ? { ...d, ...atualizado } : d))
    );
  }

  function aplicarDocumentoAtualizado(atualizado: DocumentoCliente) {
    setDetalhe(atualizado);
    setStatusDetalhe(atualizado.status);
    setRespostaTexto(atualizado.respostaEscritorio ?? "");
    sincronizarDocumentoNaLista(atualizado);
  }

  async function salvarAlteracoes() {
    if (!detalhe || salvando) return;

    const texto = respostaTexto.trim();
    const respostaSalva = (detalhe.respostaEscritorio ?? "").trim();
    const statusMudou = detalhe.status !== statusDetalhe;
    const respostaMudou = texto !== respostaSalva;

    if (!statusMudou && !respostaMudou) {
      setFeedbackModal({ tipo: "erro", texto: "Nenhuma alteração para salvar." });
      return;
    }
    if (respostaMudou && !texto) {
      setFeedbackModal({ tipo: "erro", texto: "Informe a resposta ao cliente." });
      return;
    }
    if (texto.length > 2000) {
      setFeedbackModal({ tipo: "erro", texto: "A resposta pode ter no máximo 2000 caracteres." });
      return;
    }

    const docId = detalhe.documentoId;
    let atualizado: DocumentoCliente | null = null;

    try {
      setSalvando(true);
      setFeedbackModal(null);
      setErro(null);

      if (statusMudou) {
        atualizado = await atualizarStatusDocumento(docId, statusDetalhe);
      }
      if (respostaMudou) {
        atualizado = await responderDocumento(docId, texto);
      }

      if (!atualizado) {
        atualizado = await obterDocumentoCliente(docId);
      }

      aplicarDocumentoAtualizado(atualizado);

      const partes: string[] = [];
      if (statusMudou) partes.push(`Status: ${labelStatusDocumentoCliente(atualizado.status)}`);
      if (respostaMudou) partes.push("Resposta registrada para o cliente");
      setFeedbackModal({
        tipo: "sucesso",
        texto: partes.join(" · ") || "Alterações salvas com sucesso.",
      });
      setMensagemSucesso("Documento atualizado com sucesso.");
      await carregarResumo();
      invalidateDocumentosClientesResumo();
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e, "Não foi possível salvar as alterações.");
      setFeedbackModal({ tipo: "erro", texto: msg });
      setErro(msg);
      try {
        const docAtual = await obterDocumentoCliente(docId);
        aplicarDocumentoAtualizado(docAtual);
      } catch {
        /* mantém estado local se refetch falhar */
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="page-documentos-clientes">
      <header className="page-documentos-clientes__head">
        <p className="page-documentos-clientes__contexto">Sistema de Gestão de Inadimplentes</p>
        <h1 className="page-documentos-clientes__titulo">Documentos do portal</h1>
        <p className="page-documentos-clientes__subtitulo">
          Visualize documentos enviados pelos clientes e responda por texto.
        </p>
      </header>

      {mensagemSucesso && (
        <p className="toast toast--sucesso toast--flutuante" role="status">
          {mensagemSucesso}
        </p>
      )}

      {erro && !detalhe && (
        <p className="page-documentos-clientes__erro" role="alert">
          {erro}
        </p>
      )}

      <div className="page-documentos-clientes__cards">
        {STATUS_CARDS.map(({ status, label, chave }) => (
          <button
            key={chave}
            type="button"
            className={`page-documentos-clientes__card${statusFiltro === status ? " page-documentos-clientes__card--ativa" : ""}`}
            onClick={() => aplicarFiltroStatus(status)}
          >
            <span className="page-documentos-clientes__card-label">{label}</span>
            <span className="page-documentos-clientes__card-valor">{resumo?.[chave] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="page-documentos-clientes__filtros">
        <div className="page-documentos-clientes__filtro-cliente">
          <label className="page-documentos-clientes__filtro-label" htmlFor="filtro-cliente-doc">
            Cliente
          </label>
          <div className="page-documentos-clientes__autocomplete">
            <input
              id="filtro-cliente-doc"
              type="search"
              className="page-documentos-clientes__input"
              placeholder="Buscar por nome ou código..."
              value={clienteBusca}
              onChange={(e) => {
                setClienteBusca(e.target.value);
                if (clienteSelecionado && e.target.value !== clienteSelecionado.nome) {
                  setClienteSelecionado(null);
                  setClienteId("");
                }
              }}
              autoComplete="off"
            />
            {clienteSelecionado && (
              <button type="button" className="page-documentos-clientes__limpar-cliente" onClick={limparCliente}>
                Limpar
              </button>
            )}
            {clientesSugestoes.length > 0 && (
              <ul className="page-documentos-clientes__sugestoes" role="listbox">
                {clientesSugestoes.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => selecionarCliente(c)}>
                      <strong>{c.nome}</strong>
                      {c.codigo ? <span> · Cód. {c.codigo}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="page-documentos-clientes__filtro-tipo">
          <label className="page-documentos-clientes__filtro-label" htmlFor="filtro-tipo-doc">
            Tipo
          </label>
          <select
            id="filtro-tipo-doc"
            className="page-documentos-clientes__input"
            value={tipoFiltro}
            onChange={(e) => {
              setTipoFiltro(e.target.value as TipoDocumentoCliente | "");
              setPagina(0);
            }}
          >
            <option value="">Todos os tipos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {labelTipoDocumentoCliente(t)}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="btn btn--secondary" onClick={() => void carregarLista()} disabled={loading}>
          Atualizar
        </button>
      </div>

      <div className="page-documentos-clientes__tabela-wrap">
        <table className="page-documentos-clientes__tabela">
          <thead>
            <tr>
              <th>Enviado em</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Arquivo</th>
              <th>Observação</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="page-documentos-clientes__vazio">
                  Carregando…
                </td>
              </tr>
            ) : documentos.length === 0 ? (
              <tr>
                <td colSpan={7} className="page-documentos-clientes__vazio">
                  Nenhum documento encontrado.
                </td>
              </tr>
            ) : (
              documentos.map((doc) => (
                <tr key={doc.documentoId}>
                  <td>{formatarDataDocumento(doc.enviadoEm)}</td>
                  <td>
                    <div className="page-documentos-clientes__cliente-celula">
                      <strong>{doc.clienteNome ?? "—"}</strong>
                      {doc.clienteCodigo ? <span>Cód. {doc.clienteCodigo}</span> : null}
                    </div>
                  </td>
                  <td>{labelTipoDocumentoCliente(doc.tipo)}</td>
                  <td>
                    <span className="page-documentos-clientes__arquivo" title={doc.nomeOriginal}>
                      {doc.nomeOriginal}
                    </span>
                    <small>{formatarTamanhoArquivo(doc.tamanhoBytes)}</small>
                  </td>
                  <td title={doc.observacaoCliente}>{truncarTexto(doc.observacaoCliente, 50)}</td>
                  <td>
                    <span className={`page-documentos-clientes__badge ${classeBadgeStatusDocumento(doc.status)}`}>
                      {labelStatusDocumentoCliente(doc.status)}
                    </span>
                  </td>
                  <td>
                    <div className="page-documentos-clientes__acoes-linha">
                      <button type="button" className="btn btn--small btn--secondary" onClick={() => void abrirDetalhe(doc.documentoId)}>
                        Ver
                      </button>
                      <button
                        type="button"
                        className="btn btn--small btn--secondary"
                        onClick={async () => {
                          try {
                            await baixarArquivoDocumento(doc.documentoId, doc.nomeOriginal);
                          } catch (e: unknown) {
                            setErro(getApiErrorMessage(e, "Falha ao baixar o arquivo."));
                          }
                        }}
                      >
                        Baixar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="page-documentos-clientes__paginacao">
          <button type="button" className="btn btn--secondary" disabled={pagina <= 0 || loading} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </button>
          <span>
            Página {pagina + 1} de {totalPaginas} ({totalElementos} documento{totalElementos === 1 ? "" : "s"})
          </span>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={pagina >= totalPaginas - 1 || loading}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      )}

      {detalhe &&
        createPortal(
          <div className="modal-overlay modal-overlay--blur" role="presentation" onClick={fecharDetalhe}>
            <div
              className="modal modal--largo page-documentos-clientes__modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-doc-titulo"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="page-documentos-clientes__modal-head">
                <div>
                  <p className="page-documentos-clientes__contexto">Documento do portal</p>
                  <div className="page-documentos-clientes__modal-titulo-linha">
                    <h2 id="modal-doc-titulo" className="modal__titulo">
                      {detalhe.nomeOriginal}
                    </h2>
                    <span className={`page-documentos-clientes__badge ${classeBadgeStatusDocumento(statusDetalhe)}`}>
                      {labelStatusDocumentoCliente(statusDetalhe)}
                    </span>
                  </div>
                  <p className="page-documentos-clientes__modal-meta">
                    {detalhe.clienteNome}
                    {detalhe.clienteCodigo ? ` · Cód. ${detalhe.clienteCodigo}` : ""}
                    {" · "}
                    Enviado em {formatarDataDocumento(detalhe.enviadoEm)}
                  </p>
                </div>
                <button type="button" className="page-documentos-clientes__modal-fechar" onClick={fecharDetalhe} aria-label="Fechar">
                  ×
                </button>
              </header>

              {feedbackModal && (
                <p
                  className={`toast toast--${feedbackModal.tipo === "sucesso" ? "sucesso" : "erro"} page-documentos-clientes__modal-feedback`}
                  role="status"
                >
                  {feedbackModal.texto}
                </p>
              )}

              {erro && !feedbackModal && (
                <p className="page-documentos-clientes__erro" role="alert">
                  {erro}
                </p>
              )}

              <div className="page-documentos-clientes__modal-grid">
                <section className="page-documentos-clientes__modal-secao">
                  <h3 className="page-documentos-clientes__secao-titulo">Informações</h3>
                  <dl className="page-documentos-clientes__meta-lista">
                    <div>
                      <dt>Tipo</dt>
                      <dd>{labelTipoDocumentoCliente(detalhe.tipo)}</dd>
                    </div>
                    <div>
                      <dt>Tamanho</dt>
                      <dd>{formatarTamanhoArquivo(detalhe.tamanhoBytes)}</dd>
                    </div>
                    {detalhe.protocoloDivida ? (
                      <div>
                        <dt>Protocolo da dívida</dt>
                        <dd>{detalhe.protocoloDivida}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <h3 className="page-documentos-clientes__secao-titulo">Mensagem do cliente</h3>
                  <p className="page-documentos-clientes__mensagem-cliente">
                    {detalhe.observacaoCliente?.trim() || "Nenhuma observação informada."}
                  </p>

                  <div className="page-documentos-clientes__arquivo-acoes">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      disabled={salvando || carregandoDetalhe}
                      onClick={() => void abrirArquivoDocumento(detalhe.documentoId).catch((e: unknown) => setErro(getApiErrorMessage(e, "Falha ao abrir o arquivo.")))}
                    >
                      Visualizar arquivo
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      disabled={salvando || carregandoDetalhe}
                      onClick={() =>
                        void baixarArquivoDocumento(detalhe.documentoId, detalhe.nomeOriginal).catch((e: unknown) =>
                          setErro(getApiErrorMessage(e, "Falha ao baixar o arquivo."))
                        )
                      }
                    >
                      Baixar
                    </button>
                  </div>
                </section>

                <section className="page-documentos-clientes__modal-secao">
                  <h3 className="page-documentos-clientes__secao-titulo">Resposta ao cliente</h3>
                  <textarea
                    className="page-documentos-clientes__textarea"
                    rows={8}
                    maxLength={2000}
                    value={respostaTexto}
                    onChange={(e) => setRespostaTexto(e.target.value)}
                    placeholder="Digite a resposta que o cliente verá no portal..."
                    disabled={salvando || carregandoDetalhe}
                  />
                  <p className="page-documentos-clientes__contador">{respostaTexto.length}/2000</p>

                  {detalhe.respondidoEm && (
                    <p className="page-documentos-clientes__respondido-info">
                      Respondido em {formatarDataDocumento(detalhe.respondidoEm)}
                      {detalhe.respondidoPorNome ? ` por ${detalhe.respondidoPorNome}` : ""}
                    </p>
                  )}

                  <div className="page-documentos-clientes__status-linha">
                    <label htmlFor="status-documento">Status</label>
                    <select
                      id="status-documento"
                      className="page-documentos-clientes__input"
                      value={statusDetalhe}
                      disabled={salvando || carregandoDetalhe}
                      onChange={(e) => {
                        setStatusDetalhe(e.target.value as StatusDocumentoCliente);
                        setFeedbackModal(null);
                      }}
                    >
                      <option value="RECEBIDO">Recebido</option>
                      <option value="EM_ANALISE">Em análise</option>
                      <option value="ARQUIVADO">Arquivado</option>
                    </select>
                  </div>

                  <div className="modal__botoes">
                    <button type="button" className="btn btn--secondary" onClick={fecharDetalhe} disabled={salvando}>
                      Fechar
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => void salvarAlteracoes()}
                      disabled={salvando || carregandoDetalhe}
                    >
                      {salvando ? "Salvando…" : "Salvar"}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
