import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  api,
  getApiErrorMessage,
  normalizeListResponse,
} from "@/lib/api";
import {
  normalizeClienteFromApi,
  normalizePaginaLotesEnvioFromApi,
} from "@/lib/apiNormalizers";
import {
  abrirPdfItem,
  atualizarClienteItem,
  baixarRelatorioCsv,
  confirmarItemEnvioBoleto,
  consultarResultadoEnvioLote,
  criarLoteEnvioBoletos,
  enviarLoteEnvioBoletos,
  ignorarItemEnvioBoleto,
  validarLoteEnvioBoletos,
} from "@/lib/envioBoletosApi";
import {
  envioBoletoIdItem,
  exibirDocumento,
  exibirEmailItem,
  formatarTamanhoArquivo,
  indicadorStatusItem,
  itemBloqueiaEnvio,
  idsProntosParaEnvio,
  itensComErroParaReenvio,
  itensElegiveisEnvio,
  labelConfianca,
  labelMetodoIdentificacao,
  labelStatusItem,
  loteTemItensProntos,
  mensagemBloqueiosValidacao,
  motivoBloqueioItem,
  podeEnviarSelecionados,
  resumoCardsFromLote,
  todosItensSelecionaveis,
  validarArquivosPdf,
} from "@/lib/envioBoletosUtils";
import AdminItemCard from "@/components/AdminItemCard";
import ResponsiveList from "@/components/ResponsiveList";
import type { Cliente, ItemEnvioBoleto, LoteEnvioBoleto, LoteEnvioBoletoResumo, ResultadoEnvioItem, ResultadoEnvioLote } from "@/types/api";

type AbaPrincipal = "novo" | "historico";
type EtapaNovo = "upload" | "conferencia" | "resultado";

function formatarDataHora(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WebEnvioBoletos() {
  const [aba, setAba] = useState<AbaPrincipal>("novo");
  const [etapa, setEtapa] = useState<EtapaNovo>("upload");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [lote, setLote] = useState<LoteEnvioBoleto | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [dragAtivo, setDragAtivo] = useState(false);
  const [modalConfirmarEnvio, setModalConfirmarEnvio] = useState(false);
  const [permitirReenvioDuplicado, setPermitirReenvioDuplicado] = useState(false);
  const [itemCorrigir, setItemCorrigir] = useState<ItemEnvioBoleto | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState("");
  const [loadingClientes, setLoadingClientes] = useState(false);

  const [historico, setHistorico] = useState<LoteEnvioBoletoResumo[]>([]);
  const [historicoPagina, setHistoricoPagina] = useState(0);
  const [historicoTotalPaginas, setHistoricoTotalPaginas] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [resultadoHistorico, setResultadoHistorico] = useState<ResultadoEnvioLote | null>(null);

  const inputArquivosRef = useRef<HTMLInputElement>(null);
  const inputPastaRef = useRef<HTMLInputElement>(null);

  const itens = lote?.itens ?? [];
  const cards = useMemo(() => resumoCardsFromLote(lote), [lote]);
  const podeEnviar = podeEnviarSelecionados(itens, selecionados, lote?.validacao);
  const itensErro = itensComErroParaReenvio(itens);
  const resumoConfirmacao = useMemo(() => {
    const selecionadosLista = itens.filter((item) => selecionados.has(envioBoletoIdItem(item)));
    const prontos = itensElegiveisEnvio(itens, selecionados);
    const duplicados = selecionadosLista.filter((item) => String(item.status ?? "").toUpperCase() === "DUPLICADO").length;
    return {
      selecionados: selecionadosLista.length,
      prontos: prontos.length,
      duplicados,
    };
  }, [itens, selecionados]);

  const adicionarArquivos = useCallback((lista: FileList | File[]) => {
    const novos = Array.from(lista);
    setArquivos((prev) => {
      const mapa = new Map(prev.map((f) => [`${f.name}|${f.size}`, f]));
      for (const f of novos) mapa.set(`${f.name}|${f.size}`, f);
      return Array.from(mapa.values());
    });
    setErro(null);
  }, []);

  const removerArquivo = (idx: number) => {
    setArquivos((prev) => prev.filter((_, i) => i !== idx));
  };

  const limparNovoEnvio = () => {
    setEtapa("upload");
    setArquivos([]);
    setLote(null);
    setSelecionados(new Set());
    setPermitirReenvioDuplicado(false);
    setErro(null);
    setMensagemSucesso(null);
  };

  async function enviarUpload() {
    const { validos, erros } = validarArquivosPdf(arquivos);
    if (validos.length === 0) {
      setErro(erros[0] ?? "Selecione ao menos um arquivo PDF.");
      return;
    }
    if (erros.length > 0) setErro(erros.join(" "));
    try {
      setLoading(true);
      setErro(null);
      const loteNormalizado = await criarLoteEnvioBoletos(validos);
      setLote(loteNormalizado);
      setEtapa("conferencia");
      setMensagemSucesso("Arquivos enviados. Revise a conferência antes de disparar os e-mails.");
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao enviar os arquivos."));
    } finally {
      setLoading(false);
    }
  }

  async function validarLoteAtual() {
    if (!lote?.loteId) return;
    try {
      setLoading(true);
      setErro(null);
      const atualizado = await validarLoteEnvioBoletos(lote.loteId);
      setLote(atualizado);
      const msgBloqueios = mensagemBloqueiosValidacao(atualizado.validacao);
      if (msgBloqueios) {
        setErro(msgBloqueios);
      }
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao validar o lote."));
    } finally {
      setLoading(false);
    }
  }

  async function executarEnvio(itemIds?: string[]) {
    if (!lote?.loteId) return;
    const ids = idsProntosParaEnvio(itens, selecionados, itemIds);
    if (ids.length === 0) {
      setErro("Nenhum item pronto para envio.");
      return;
    }
    try {
      setLoading(true);
      setErro(null);
      const atualizado = await enviarLoteEnvioBoletos(lote.loteId, {
        permitirReenvioDuplicado,
        itemIds: ids,
      });
      setLote(atualizado);
      setEtapa("resultado");
      setModalConfirmarEnvio(false);
      setMensagemSucesso("Envio processado. Confira o resultado abaixo.");
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao enviar os boletos."));
    } finally {
      setLoading(false);
    }
  }

  async function patchItem(itemId: string, acao: "confirmar" | "ignorar") {
    if (!lote?.loteId) return;
    try {
      setLoading(true);
      setErro(null);
      if (acao === "confirmar") {
        await confirmarItemEnvioBoleto(lote.loteId, itemId);
      } else {
        await ignorarItemEnvioBoleto(lote.loteId, itemId);
      }
      await validarLoteAtual();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao atualizar o item."));
    } finally {
      setLoading(false);
    }
  }

  async function abrirModalCorrigir(item: ItemEnvioBoleto) {
    setItemCorrigir(item);
    setClienteSelecionadoId(item.clienteId ?? "");
    setBuscaCliente("");
    await carregarClientes();
  }

  async function carregarClientes(termo?: string) {
    try {
      setLoadingClientes(true);
      const params: Record<string, string | number> = { page: 0, size: 50, statusCliente: "ATIVO" };
      if (termo?.trim()) params.busca = termo.trim();
      const r = await api.get("/api/clientes", { params });
      const list = normalizeListResponse<Record<string, unknown>>(r.data).map(normalizeClienteFromApi);
      setClientes(list);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao buscar clientes."));
    } finally {
      setLoadingClientes(false);
    }
  }

  async function salvarClienteCorrigido() {
    if (!lote?.loteId || !itemCorrigir || !clienteSelecionadoId) return;
    try {
      setLoading(true);
      setErro(null);
      await atualizarClienteItem(lote.loteId, envioBoletoIdItem(itemCorrigir), clienteSelecionadoId);
      setItemCorrigir(null);
      await validarLoteAtual();
      setMensagemSucesso("Cliente atualizado no item.");
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao corrigir o cliente."));
    } finally {
      setLoading(false);
    }
  }

  async function visualizarPdf(itemId: string) {
    if (!lote?.loteId) return;
    try {
      setErro(null);
      await abrirPdfItem(lote.loteId, itemId);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Não foi possível abrir o PDF."));
    }
  }

  async function carregarHistorico(page = historicoPagina) {
    try {
      setLoading(true);
      setErro(null);
      const params: Record<string, string | number> = { page, size: 10 };
      if (filtroStatus.trim()) params.status = filtroStatus.trim();
      if (filtroDataInicio) params.dataInicio = filtroDataInicio;
      if (filtroDataFim) params.dataFim = filtroDataFim;
      const r = await api.get("/api/lotes-envio-boletos", { params });
      const pagina = normalizePaginaLotesEnvioFromApi(r.data);
      setHistorico(pagina.content);
      setHistoricoTotalPaginas(Math.max(1, pagina.totalPages));
      setHistoricoPagina(pagina.number);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar o histórico."));
    } finally {
      setLoading(false);
    }
  }

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

  function toggleItem(envioBoletoId: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(envioBoletoId)) next.delete(envioBoletoId);
      else next.add(envioBoletoId);
      return next;
    });
  }

  const toggleTodos = () => {
    const ids = todosItensSelecionaveis(itens);
    if (ids.every((id) => selecionados.has(id))) setSelecionados(new Set());
    else setSelecionados(new Set(ids));
  };

  useEffect(() => {
    if (!lote?.itens) return;
    const prontos = lote.itens
      .filter((i) => String(i.status ?? "").toUpperCase() === "PRONTO_PARA_ENVIO")
      .map((i) => i.envioBoletoId)
      .filter(Boolean);
    setSelecionados(new Set(prontos));
  }, [lote?.loteId, lote?.itens]);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 5000);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  useEffect(() => {
    if (aba === "historico") carregarHistorico(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

  useEffect(() => {
    const bloqueado = modalConfirmarEnvio || itemCorrigir != null || resultadoHistorico != null;
    document.body.style.overflow = bloqueado ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalConfirmarEnvio, itemCorrigir, resultadoHistorico]);

  useEffect(() => {
    if (etapa === "conferencia" && lote?.loteId && !lote.validacao) {
      validarLoteAtual();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, lote?.loteId]);

  const clientesFiltrados = useMemo(() => {
    const t = buscaCliente.trim().toLowerCase();
    if (!t) return clientes;
    return clientes.filter((c) => {
      const nome = c.nome.toLowerCase();
      const codigo = (c.codigo ?? "").toLowerCase();
      const doc = (c.cpf ?? "").replace(/\D/g, "");
      const buscaDoc = t.replace(/\D/g, "");
      return nome.includes(t) || codigo.includes(t) || (buscaDoc && doc.includes(buscaDoc));
    });
  }, [clientes, buscaCliente]);

  return (
    <div className={`page-envio-boletos${aba === "novo" && etapa === "conferencia" ? " page-envio-boletos--conferencia" : ""}`}>
      <header className={`page-envio-boletos__header ${etapa === "conferencia" && aba === "novo" ? "page-envio-boletos__header--compacto" : ""}`}>
        {!(aba === "novo" && etapa === "conferencia") && (
          <div>
            <h1 className="page-envio-boletos__title">Envio de boletos</h1>
            <p className="page-envio-boletos__subtitle">
              Envie boletos em PDF por e-mail com conferência antes do disparo.
            </p>
          </div>
        )}
        {aba === "novo" && etapa !== "upload" && (
          <button type="button" className="btn btn--secondary" onClick={limparNovoEnvio}>
            Novo lote
          </button>
        )}
      </header>

      {mensagemSucesso && <p className="toast toast--sucesso">{mensagemSucesso}</p>}
      {erro && <p className="page-envio-boletos__erro">{erro}</p>}

      <div className="page-envio-boletos__abas" role="tablist" aria-label="Seções do envio de boletos">
        <button
          type="button"
          role="tab"
          aria-selected={aba === "novo"}
          className={`page-envio-boletos__aba ${aba === "novo" ? "page-envio-boletos__aba--ativa" : ""}`}
          onClick={() => setAba("novo")}
        >
          Novo envio
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === "historico"}
          className={`page-envio-boletos__aba ${aba === "historico" ? "page-envio-boletos__aba--ativa" : ""}`}
          onClick={() => setAba("historico")}
        >
          Histórico
        </button>
      </div>

      {aba === "novo" && (
        <>
          <div className="page-envio-boletos__stepper" aria-label="Etapas do envio">
            {(["upload", "conferencia", "resultado"] as EtapaNovo[]).map((e, i) => {
              const labels = ["Upload", "Conferência", "Resultado"];
              const concluida =
                (etapa === "conferencia" && e === "upload") ||
                (etapa === "resultado" && (e === "upload" || e === "conferencia"));
              const ativa = etapa === e;
              return (
                <div key={e} className="page-envio-boletos__stepper-item">
                  {i > 0 && (
                    <span
                      className={`page-envio-boletos__stepper-line ${concluida || ativa ? "page-envio-boletos__stepper-line--ativa" : ""}`}
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className={`page-envio-boletos__step ${ativa ? "page-envio-boletos__step--ativa" : ""} ${concluida ? "page-envio-boletos__step--concluida" : ""}`}
                  >
                    <span className="page-envio-boletos__step-num">{i + 1}</span>
                    <span className="page-envio-boletos__step-label">{labels[i]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {etapa === "upload" && (
            <section className="page-envio-boletos__upload">
              <div
                className={`page-envio-boletos__dropzone ${dragAtivo ? "page-envio-boletos__dropzone--ativo" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragAtivo(true);
                }}
                onDragLeave={() => setDragAtivo(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragAtivo(false);
                  if (e.dataTransfer.files?.length) adicionarArquivos(e.dataTransfer.files);
                }}
              >
                <UploadIcon />
                <p>Arraste PDFs aqui ou selecione arquivos / pasta</p>
                <div className="page-envio-boletos__upload-acoes">
                  <button type="button" className="btn btn--secondary" onClick={() => inputArquivosRef.current?.click()}>
                    Selecionar PDFs
                  </button>
                  <button type="button" className="btn btn--secondary" onClick={() => inputPastaRef.current?.click()}>
                    Selecionar pasta
                  </button>
                </div>
                <input
                  ref={inputArquivosRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  hidden
                  onChange={(e) => {
                    if (e.target.files?.length) adicionarArquivos(e.target.files);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={inputPastaRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  hidden
                  {...{ webkitdirectory: "", directory: "" }}
                  onChange={(e) => {
                    const pdfs = Array.from(e.target.files ?? []).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
                    if (pdfs.length) adicionarArquivos(pdfs);
                    e.target.value = "";
                  }}
                />
              </div>

              {arquivos.length > 0 && (
                <>
                  <p className="page-envio-boletos__contagem">
                    {arquivos.length} arquivo{arquivos.length !== 1 ? "s" : ""} selecionado{arquivos.length !== 1 ? "s" : ""}
                  </p>
                  <ul className="page-envio-boletos__lista-arquivos">
                  {arquivos.map((arquivo, idx) => (
                    <li key={`${arquivo.name}-${arquivo.size}-${idx}`}>
                      <span className="page-envio-boletos__arquivo-nome">{arquivo.name}</span>
                      <span className="page-envio-boletos__arquivo-tamanho">{formatarTamanhoArquivo(arquivo.size)}</span>
                      <button type="button" className="page-envio-boletos__remover" onClick={() => removerArquivo(idx)} aria-label={`Remover ${arquivo.name}`}>
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
                </>
              )}

              <div className="page-envio-boletos__acoes-principais">
                <button type="button" className="btn btn--primary" disabled={loading || arquivos.length === 0} onClick={enviarUpload}>
                  {loading ? "Enviando..." : "Analisar arquivos"}
                </button>
              </div>

              <div className="page-envio-boletos__ajuda" role="note">
                <p>
                  Renomeie os PDFs antes do upload: <strong>{"{código} {nome igual ao cadastro}.pdf"}</strong>
                </p>
                <p>
                  Exemplos: <code>4 ANA CLAUDIA DE CARVALHO BOTELHO.pdf</code> · <code>14.pdf</code> ·{" "}
                  <code>27383573000106.pdf</code> (CNPJ)
                </p>
                <p>O e-mail vem do cadastro do cliente. Se aparecer &quot;E-mail não encontrado&quot;, cadastre o e-mail em Clientes.</p>
              </div>
            </section>
          )}

          {etapa === "conferencia" && lote && (
            <section className="page-envio-boletos__conferencia">
              <div className="page-envio-boletos__conferencia-header">
                <h2 className="page-envio-boletos__conferencia-title">Conferência dos boletos</h2>
                <p className="page-envio-boletos__conferencia-subtitle">
                  Revise os vínculos entre boletos, clientes e e-mails antes do envio.
                </p>
              </div>

              <div className="page-envio-boletos__stats">
                <ResumoCard
                  label="Total de arquivos"
                  valor={cards.total}
                  tipo="roxo"
                  tooltip="Quantidade total de PDFs enviados neste lote."
                  icon={<FileIcon />}
                />
                <ResumoCard
                  label="Prontos para envio"
                  valor={cards.prontos}
                  tipo="verde"
                  tooltip="Itens identificados, com e-mail e aptos para disparo."
                  icon={<SendIcon />}
                />
                <ResumoCard
                  label="Sem e-mail"
                  valor={cards.semEmail}
                  tipo="amarelo"
                  tooltip="Clientes identificados sem e-mail cadastrado."
                  icon={<MailIcon />}
                />
                <ResumoCard
                  label="Pendentes de correção"
                  valor={cards.pendentesCorrecao}
                  tipo="laranja"
                  tooltip="Itens que precisam de revisão ou confirmação manual."
                  icon={<AlertIcon />}
                />
                <ResumoCard
                  label="Ignorados"
                  valor={cards.ignorados}
                  tipo="cinza"
                  tooltip="Itens excluídos do envio deste lote."
                  icon={<EyeOffIcon />}
                />
              </div>

              <ResponsiveList
                desktop={
                  <div className="page-envio-boletos__tabela-wrap page-envio-boletos__tabela-wrap--conferencia">
                    <table className="page-envio-boletos__tabela page-envio-boletos__tabela--conferencia">
                      <thead>
                        <tr>
                          <th className="page-envio-boletos__th-check">
                            <input
                              type="checkbox"
                              aria-label="Selecionar todos"
                              checked={todosItensSelecionaveis(itens).length > 0 && todosItensSelecionaveis(itens).every((id) => selecionados.has(id))}
                              onChange={toggleTodos}
                            />
                          </th>
                          <th>Arquivo</th>
                          <th>Cliente</th>
                          <th>CPF/CNPJ</th>
                          <th>E-mail</th>
                          <th>Método</th>
                          <th>Confiança</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="page-envio-boletos__vazio">
                              Nenhum item no lote.
                            </td>
                          </tr>
                        ) : (
                          itens.map((item) => {
                            const indicador = indicadorStatusItem(item);
                            const status = String(item.status ?? "").toUpperCase();
                            const emailInfo = exibirEmailItem(item);
                            const bloqueio = motivoBloqueioItem(item, lote?.validacao);
                            const itemId = envioBoletoIdItem(item);
                            return (
                              <tr key={itemId} className={itemBloqueiaEnvio(item) ? "page-envio-boletos__linha--bloqueada" : ""}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selecionados.has(itemId)}
                                    disabled={status === "IGNORADO"}
                                    onChange={() => toggleItem(itemId)}
                                    aria-label={`Selecionar ${item.nomeArquivoOriginal}`}
                                  />
                                </td>
                                <td>
                                  <div className="page-envio-boletos__arquivo-cell">
                                    <span className="page-envio-boletos__pdf-icon" aria-hidden="true">
                                      <PdfIcon />
                                    </span>
                                    <span className="page-envio-boletos__arquivo-nome-tabela" title={item.nomeArquivoOriginal}>
                                      {item.nomeArquivoOriginal}
                                    </span>
                                  </div>
                                </td>
                                <td>{item.clienteNome?.trim() || "—"}</td>
                                <td>{exibirDocumento(item.documentoMascarado)}</td>
                                <td>
                                  <span className={emailInfo.ausente ? "page-envio-boletos__email-ausente" : ""}>
                                    {emailInfo.texto}
                                  </span>
                                </td>
                                <td>{labelMetodoIdentificacao(item.metodoIdentificacao)}</td>
                                <td>{labelConfianca(item.confiancaIdentificacao)}</td>
                                <td>
                                  <span className={`page-envio-boletos__badge page-envio-boletos__badge--${indicador.cor}`}>
                                    {indicador.texto}
                                  </span>
                                  {bloqueio && itemBloqueiaEnvio(item) && (
                                    <div className="page-envio-boletos__bloqueio-item" title={bloqueio}>
                                      {bloqueio}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <div className="page-envio-boletos__acoes-linha">
                                    <button type="button" className="page-envio-boletos__acao" title="Visualizar PDF" onClick={() => visualizarPdf(itemId)}>
                                      <EyeIcon />
                                      PDF
                                    </button>
                                    <button type="button" className="page-envio-boletos__acao" onClick={() => abrirModalCorrigir(item)}>
                                      <EditIcon />
                                      Corrigir
                                    </button>
                                    {status !== "IGNORADO" && (
                                      <button type="button" className="page-envio-boletos__acao" onClick={() => patchItem(itemId, "ignorar")}>
                                        <BanIcon />
                                        Ignorar
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                }
                mobile={
                  itens.length === 0 ? (
                    <p className="page-envio-boletos__vazio">Nenhum item no lote.</p>
                  ) : (
                    <ul className="admin-item-list">
                      {itens.map((item) => {
                        const indicador = indicadorStatusItem(item);
                        const status = String(item.status ?? "").toUpperCase();
                        const emailInfo = exibirEmailItem(item);
                        const bloqueio = motivoBloqueioItem(item, lote?.validacao);
                        const itemId = envioBoletoIdItem(item);
                        return (
                          <li key={itemId}>
                            <AdminItemCard
                              title={item.nomeArquivoOriginal}
                              meta={item.clienteNome?.trim() || "—"}
                              fields={[
                                {
                                  label: "Selecionar",
                                  value: (
                                    <input
                                      type="checkbox"
                                      checked={selecionados.has(itemId)}
                                      disabled={status === "IGNORADO"}
                                      onChange={() => toggleItem(itemId)}
                                      aria-label={`Selecionar ${item.nomeArquivoOriginal}`}
                                    />
                                  ),
                                },
                                { label: "CPF/CNPJ", value: exibirDocumento(item.documentoMascarado) },
                                { label: "E-mail", value: emailInfo.texto },
                                { label: "Método", value: labelMetodoIdentificacao(item.metodoIdentificacao) },
                                {
                                  label: "Status",
                                  value: (
                                    <>
                                      <span className={`page-envio-boletos__badge page-envio-boletos__badge--${indicador.cor}`}>
                                        {indicador.texto}
                                      </span>
                                      {bloqueio && itemBloqueiaEnvio(item) ? (
                                        <span className="page-envio-boletos__bloqueio-item">{bloqueio}</span>
                                      ) : null}
                                    </>
                                  ),
                                },
                              ]}
                              actions={
                                <>
                                  <button type="button" className="btn btn--secondary btn--small" onClick={() => visualizarPdf(itemId)}>
                                    PDF
                                  </button>
                                  <button type="button" className="btn btn--secondary btn--small" onClick={() => abrirModalCorrigir(item)}>
                                    Corrigir
                                  </button>
                                  {status !== "IGNORADO" && (
                                    <button type="button" className="btn btn--danger btn--small" onClick={() => patchItem(itemId, "ignorar")}>
                                      Ignorar
                                    </button>
                                  )}
                                </>
                              }
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )
                }
              />

              {lote.validacao && !lote.validacao.podeEnviar && lote.validacao.bloqueios.length > 0 && (
                <div className="page-envio-boletos__bloqueios" role="alert">
                  <strong>Pendências antes do envio:</strong>
                  <ul>
                    {lote.validacao.bloqueios.map((b) => {
                      const itemRef = itens.find((i) => envioBoletoIdItem(i) === b.itemId);
                      const rotulo = itemRef?.nomeArquivoOriginal ?? b.itemId;
                      return (
                        <li key={`${b.itemId}-${b.motivo}`}>
                          <span className="page-envio-boletos__bloqueio-arquivo">{rotulo}</span>: {b.motivo}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="page-envio-boletos__acoes-principais page-envio-boletos__acoes-principais--conferencia">
                <button type="button" className="btn btn--secondary page-envio-boletos__btn-revalidar" disabled={loading} onClick={validarLoteAtual}>
                  <RefreshIcon />
                  {loading ? "Revalidando..." : "Revalidar"}
                </button>
                <button
                  type="button"
                  className="btn btn--primary page-envio-boletos__btn-enviar"
                  disabled={loading || !podeEnviar || !loteTemItensProntos(itens)}
                  onClick={() => setModalConfirmarEnvio(true)}
                >
                  <SendIcon />
                  {loading ? "Processando..." : "Enviar e-mails"}
                </button>
              </div>
            </section>
          )}

          {etapa === "resultado" && lote && (
            <section className="page-envio-boletos__resultado">
              <div className="page-envio-boletos__stats page-envio-boletos__stats--compacto">
                <ResumoCard label="Enviados" valor={cards.enviados} tipo="verde" tooltip="Boletos enviados com sucesso." icon={<SendIcon />} />
                <ResumoCard label="Erros" valor={cards.erros} tipo="laranja" tooltip="Itens com falha no envio." icon={<AlertIcon />} />
                <ResumoCard label="Ignorados" valor={cards.ignorados} tipo="cinza" tooltip="Itens ignorados no lote." icon={<EyeOffIcon />} />
              </div>

              <ResponsiveList
                desktop={
                  <div className="page-envio-boletos__tabela-wrap">
                    <table className="page-envio-boletos__tabela">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>E-mail</th>
                          <th>Arquivo</th>
                          <th>Status</th>
                          <th>Erro</th>
                          <th>Simulado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map((item) => (
                          <tr key={item.itemId}>
                            <td>{item.clienteNome?.trim() || "—"}</td>
                            <td>{exibirDocumento(item.emailDestinatario)}</td>
                            <td>{item.nomeArquivoOriginal}</td>
                            <td>
                              <span className={`page-envio-boletos__badge page-envio-boletos__badge--${indicadorStatusItem(item).cor}`}>
                                {labelStatusItem(item.status)}
                              </span>
                            </td>
                            <td>{item.erro?.trim() || "—"}</td>
                            <td>{item.simulado ? "Sim" : "Não"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                }
                mobile={
                  <ul className="admin-item-list">
                    {itens.map((item) => (
                      <li key={item.itemId}>
                        <AdminItemCard
                          title={item.clienteNome?.trim() || "—"}
                          meta={item.nomeArquivoOriginal}
                          fields={[
                            { label: "E-mail", value: exibirDocumento(item.emailDestinatario) },
                            {
                              label: "Status",
                              value: (
                                <span className={`page-envio-boletos__badge page-envio-boletos__badge--${indicadorStatusItem(item).cor}`}>
                                  {labelStatusItem(item.status)}
                                </span>
                              ),
                            },
                            { label: "Erro", value: item.erro?.trim() || "—" },
                            { label: "Simulado", value: item.simulado ? "Sim" : "Não" },
                          ]}
                        />
                      </li>
                    ))}
                  </ul>
                }
              />

              <div className="page-envio-boletos__acoes-principais">
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={loading}
                  onClick={limparNovoEnvio}
                >
                  Iniciar novo envio
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={loading}
                  onClick={async () => {
                    try {
                      await baixarRelatorioCsv(lote.loteId);
                    } catch (e: unknown) {
                      setErro(getApiErrorMessage(e, "Falha ao baixar o relatório."));
                    }
                  }}
                >
                  Baixar CSV
                </button>
                {itensErro.length > 0 && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={loading}
                    onClick={() => executarEnvio(itensErro.map((i) => envioBoletoIdItem(i)))}
                  >
                    Reenviar itens com erro ({itensErro.length})
                  </button>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {aba === "historico" && (
        <section className="page-envio-boletos__historico">
          <div className="page-envio-boletos__filtros">
            <input
              type="date"
              className="page-envio-boletos__input"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              aria-label="Data início"
            />
            <input
              type="date"
              className="page-envio-boletos__input"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              aria-label="Data fim"
            />
            <select className="page-envio-boletos__input" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} aria-label="Status">
              <option value="">Todos os status</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="CONFERENCIA">Conferência</option>
              <option value="ENVIANDO">Enviando</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
            <button type="button" className="btn btn--secondary" onClick={() => carregarHistorico(0)} disabled={loading}>
              Filtrar
            </button>
          </div>

          <p className="page-envio-boletos__historico-dica">Clique em um lote para ver os detalhes do envio por cliente.</p>

          <ResponsiveList
            desktop={
              <div className="page-envio-boletos__tabela-wrap">
                <table className="page-envio-boletos__tabela">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Itens</th>
                      <th>Enviados</th>
                      <th>Erros</th>
                      <th>Criado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="page-envio-boletos__vazio">
                          Carregando...
                        </td>
                      </tr>
                    ) : historico.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="page-envio-boletos__vazio">
                          Nenhum lote encontrado.
                        </td>
                      </tr>
                    ) : (
                      historico.map((h) => (
                        <tr
                          key={h.loteId}
                          className="page-envio-boletos__linha-clicavel"
                          title="Clique para ver detalhes"
                          onClick={() => abrirDetalheHistorico(h.loteId)}
                          onKeyDown={(e) => e.key === "Enter" && abrirDetalheHistorico(h.loteId)}
                          tabIndex={0}
                          role="button"
                        >
                          <td>{formatarDataHora(h.criadoEm)}</td>
                          <td>{h.status}</td>
                          <td>{h.totalItens ?? "—"}</td>
                          <td>{h.enviados ?? "—"}</td>
                          <td>{h.erros ?? "—"}</td>
                          <td>{h.criadoPor?.trim() || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            }
            mobile={
              loading ? (
                <p className="page-envio-boletos__vazio">Carregando...</p>
              ) : historico.length === 0 ? (
                <p className="page-envio-boletos__vazio">Nenhum lote encontrado.</p>
              ) : (
                <ul className="admin-item-list">
                  {historico.map((h) => (
                    <li key={h.loteId}>
                      <AdminItemCard
                        title={formatarDataHora(h.criadoEm)}
                        meta={h.status}
                        onClick={() => abrirDetalheHistorico(h.loteId)}
                        fields={[
                          { label: "Itens", value: h.totalItens ?? "—" },
                          { label: "Enviados", value: h.enviados ?? "—" },
                          { label: "Erros", value: h.erros ?? "—" },
                          { label: "Criado por", value: h.criadoPor?.trim() || "—" },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              )
            }
          />

          <div className="page-envio-boletos__paginacao">
            <button
              type="button"
              className="btn btn--secondary"
              disabled={historicoPagina <= 0 || loading}
              onClick={() => carregarHistorico(historicoPagina - 1)}
            >
              Anterior
            </button>
            <span>
              Página {historicoPagina + 1} de {historicoTotalPaginas}
            </span>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={historicoPagina + 1 >= historicoTotalPaginas || loading}
              onClick={() => carregarHistorico(historicoPagina + 1)}
            >
              Próxima
            </button>
          </div>
        </section>
      )}

      {modalConfirmarEnvio &&
        createPortal(
          <div
            className="modal-overlay modal-overlay--blur"
            role="presentation"
            onClick={() => !loading && setModalConfirmarEnvio(false)}
          >
            <div
              className="modal modal-envio-confirmacao"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-envio-titulo"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="modal-envio-confirmacao__close"
                onClick={() => !loading && setModalConfirmarEnvio(false)}
                aria-label="Fechar"
                disabled={loading}
              >
                <CloseIcon />
              </button>

              <header className="modal-envio-confirmacao__header">
                <span className="modal-envio-confirmacao__icon" aria-hidden="true">
                  <MailIcon />
                </span>
                <div>
                  <h2 id="modal-envio-titulo" className="modal-envio-confirmacao__title">
                    Confirmar envio de e-mails
                  </h2>
                  <p className="modal-envio-confirmacao__subtitle">
                    Os e-mails reais serão enviados para os destinatários selecionados.
                  </p>
                </div>
              </header>

              <div className="modal-envio-confirmacao__alerta" role="alert">
                <AlertTriangleIcon />
                <p>
                  <strong>Atenção:</strong> os e-mails serão enviados de verdade para os destinatários selecionados.
                  Revise cuidadosamente a conferência antes de continuar.
                </p>
              </div>

              <div className="modal-envio-confirmacao__resumo">
                <p className="modal-envio-confirmacao__resumo-titulo">Resumo do envio</p>
                <div className="modal-envio-confirmacao__resumo-cards">
                  <div className="modal-envio-confirmacao__resumo-card modal-envio-confirmacao__resumo-card--roxo">
                    <span className="modal-envio-confirmacao__resumo-icone" aria-hidden="true">
                      <UsersIcon />
                    </span>
                    <div>
                      <span className="modal-envio-confirmacao__resumo-label">Selecionados</span>
                      <strong className="modal-envio-confirmacao__resumo-valor">{resumoConfirmacao.selecionados}</strong>
                    </div>
                  </div>
                  <div className="modal-envio-confirmacao__resumo-card modal-envio-confirmacao__resumo-card--verde">
                    <span className="modal-envio-confirmacao__resumo-icone" aria-hidden="true">
                      <CheckCircleIcon />
                    </span>
                    <div>
                      <span className="modal-envio-confirmacao__resumo-label">Prontos para envio</span>
                      <strong className="modal-envio-confirmacao__resumo-valor">{resumoConfirmacao.prontos}</strong>
                    </div>
                  </div>
                  <div className="modal-envio-confirmacao__resumo-card modal-envio-confirmacao__resumo-card--laranja">
                    <span className="modal-envio-confirmacao__resumo-icone" aria-hidden="true">
                      <DuplicateIcon />
                    </span>
                    <div>
                      <span className="modal-envio-confirmacao__resumo-label">Duplicados detectados</span>
                      <strong className="modal-envio-confirmacao__resumo-valor">{resumoConfirmacao.duplicados}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <label className="modal-envio-confirmacao__checkbox">
                <input
                  type="checkbox"
                  checked={permitirReenvioDuplicado}
                  onChange={(e) => setPermitirReenvioDuplicado(e.target.checked)}
                  disabled={loading}
                />
                Permitir reenvio de boletos duplicados
              </label>

              <footer className="modal-envio-confirmacao__footer">
                <button type="button" className="btn btn--secondary" onClick={() => setModalConfirmarEnvio(false)} disabled={loading}>
                  Cancelar
                </button>
                <button type="button" className="btn btn--primary modal-envio-confirmacao__btn-confirmar" disabled={loading} onClick={() => executarEnvio()}>
                  {loading ? "Enviando..." : "Confirmar envio"}
                </button>
              </footer>
            </div>
          </div>,
          document.body
        )}

      {itemCorrigir &&
        createPortal(
          <div className="modal-overlay" role="presentation" onClick={() => setItemCorrigir(null)}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-cliente-titulo" onClick={(e) => e.stopPropagation()}>
              <h2 id="modal-cliente-titulo" className="modal__titulo">
                Corrigir cliente
              </h2>
              <p className="page-envio-boletos__modal-arquivo">Arquivo: {itemCorrigir.nomeArquivoOriginal}</p>
              <input
                type="text"
                className="page-envio-boletos__input page-envio-boletos__input--full"
                placeholder="Buscar cliente por nome, código ou CPF/CNPJ..."
                value={buscaCliente}
                onChange={(e) => {
                  setBuscaCliente(e.target.value);
                  carregarClientes(e.target.value);
                }}
              />
              <div className="page-envio-boletos__lista-clientes">
                {loadingClientes ? (
                  <p>Carregando clientes...</p>
                ) : clientesFiltrados.length === 0 ? (
                  <p>Nenhum cliente encontrado.</p>
                ) : (
                  clientesFiltrados.map((c) => (
                    <label key={c.id} className="page-envio-boletos__cliente-opcao">
                      <input
                        type="radio"
                        name="cliente-correcao"
                        value={c.id}
                        checked={clienteSelecionadoId === c.id}
                        onChange={() => setClienteSelecionadoId(c.id ?? "")}
                      />
                      <span>
                        <strong>{c.nome}</strong>
                        {c.codigo ? ` · ${c.codigo}` : ""}
                        {c.cpf ? ` · ${c.cpf}` : ""}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <div className="modal__acoes">
                <button type="button" className="btn btn--secondary" onClick={() => setItemCorrigir(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn--primary" disabled={loading || !clienteSelecionadoId} onClick={salvarClienteCorrigido}>
                  Salvar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {resultadoHistorico &&
        createPortal(
          <div className="modal-overlay" role="presentation" onClick={() => setResultadoHistorico(null)}>
            <div className="modal modal--largo" role="dialog" aria-modal="true" aria-labelledby="modal-historico-titulo" onClick={(e) => e.stopPropagation()}>
              <h2 id="modal-historico-titulo" className="modal__titulo">
                Detalhe do lote
              </h2>
              <p className="page-envio-boletos__modal-resumo">
                {formatarDataHora(resultadoHistorico.criadoEm)}
                {resultadoHistorico.dataFinalizacao ? ` · Finalizado em ${formatarDataHora(resultadoHistorico.dataFinalizacao)}` : ""}
                {resultadoHistorico.status ? ` · ${resultadoHistorico.status}` : ""}
              </p>

              <SecaoResultadoHistorico
                titulo="Enviados"
                variante="verde"
                itens={resultadoHistorico.enviados}
                colunas={["cliente", "email", "arquivo", "data"]}
              />
              <SecaoResultadoHistorico
                titulo="Com erro"
                variante="vermelho"
                itens={resultadoHistorico.comErro}
                colunas={["cliente", "email", "arquivo", "erro"]}
              />
              <SecaoResultadoHistorico
                titulo="Não enviados"
                variante="cinza"
                itens={resultadoHistorico.naoEnviados}
                colunas={["cliente", "email", "arquivo", "status"]}
              />

              <div className="modal__acoes">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={async () => {
                    try {
                      await baixarRelatorioCsv(resultadoHistorico.loteId);
                    } catch (e: unknown) {
                      setErro(getApiErrorMessage(e, "Falha ao baixar o relatório."));
                    }
                  }}
                >
                  Baixar CSV
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => setResultadoHistorico(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function SecaoResultadoHistorico({
  titulo,
  variante,
  itens,
  colunas,
}: {
  titulo: string;
  variante: "verde" | "vermelho" | "cinza";
  itens: ResultadoEnvioItem[];
  colunas: Array<"cliente" | "email" | "arquivo" | "data" | "erro" | "status">;
}) {
  return (
    <section className={`page-envio-boletos__secao-resultado page-envio-boletos__secao-resultado--${variante}`}>
      <h3 className="page-envio-boletos__secao-titulo">
        {titulo} <span className="page-envio-boletos__secao-contagem">({itens.length})</span>
      </h3>
      {itens.length === 0 ? (
        <p className="page-envio-boletos__secao-vazio">Nenhum item.</p>
      ) : (
        <div className="page-envio-boletos__tabela-wrap">
          <table className="page-envio-boletos__tabela page-envio-boletos__tabela--secao">
            <thead>
              <tr>
                {colunas.includes("cliente") && <th>Cliente</th>}
                {colunas.includes("email") && <th>E-mail</th>}
                {colunas.includes("arquivo") && <th>Arquivo</th>}
                {colunas.includes("data") && <th>Data envio</th>}
                {colunas.includes("erro") && <th>Erro</th>}
                {colunas.includes("status") && <th>Status</th>}
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.envioBoletoId}>
                  {colunas.includes("cliente") && <td>{item.clienteNome?.trim() || "—"}</td>}
                  {colunas.includes("email") && <td>{exibirDocumento(item.emailDestinatario)}</td>}
                  {colunas.includes("arquivo") && <td>{item.nomeArquivoOriginal ?? "—"}</td>}
                  {colunas.includes("data") && <td>{formatarDataHora(item.dataEnvio)}</td>}
                  {colunas.includes("erro") && <td>{item.mensagemErro?.trim() || "—"}</td>}
                  {colunas.includes("status") && <td>{labelStatusItem(item.status)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ResumoCard({
  label,
  valor,
  tipo,
  tooltip,
  icon,
}: {
  label: string;
  valor: number;
  tipo: "roxo" | "verde" | "amarelo" | "laranja" | "cinza";
  tooltip: string;
  icon: ReactNode;
}) {
  return (
    <div className={`page-envio-boletos__stat page-envio-boletos__stat--${tipo}`}>
      <div className="page-envio-boletos__stat-head">
        <span className="page-envio-boletos__stat-label">{label}</span>
        <button type="button" className="page-envio-boletos__stat-info" title={tooltip} aria-label={tooltip}>
          <InfoIcon />
        </button>
      </div>
      <div className="page-envio-boletos__stat-body">
        <strong className="page-envio-boletos__stat-valor">{valor}</strong>
        <span className={`page-envio-boletos__stat-icon page-envio-boletos__stat-icon--${tipo}`} aria-hidden="true">
          {icon}
        </span>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
