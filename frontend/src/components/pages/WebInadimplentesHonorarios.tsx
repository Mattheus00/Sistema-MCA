import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, getApiErrorMessage, isMockEnabled, normalizeListResponse, encodeConfirmadoPorComprovante, getUsuarioLogadoLabel } from "@/lib/api";
import {
  normalizeClienteFromApi,
  normalizeInadimplenciaFromApi,
} from "@/lib/apiNormalizers";
import { invalidateDashboard } from "@/lib/dashboardRefresh";
import {
  diasEmAtraso,
  formatarData,
  formatarMesAno,
  formatarMoeda,
  formatCpfCnpj,
  isInadimplenciaCancelada,
  isInadimplenciaEmAberto,
  saldoDevedorItem,
  statusPagamentoHonorario,
  valoresHonorario,
} from "@/lib/inadimplentesUtils";
import {
  buildWhatsAppCobrancaUrl,
  copyCobrancaEmailToClipboard,
  normalizeTelefoneParaWhatsApp,
  openWhatsAppCobranca,
} from "@/lib/mailtoCobranca";
import { gerarEBaixarAvisoPendenciaPdf } from "@/lib/cobrancaPdf";
import { parseValorReais } from "@/lib/valorBrasil";
import type { Cliente, Inadimplencia } from "@/types/api";

const ZOHO_MAIL_URL = "https://mail.zoho.com/zm/#mail/folder/sent";

export default function WebInadimplentesHonorarios() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  const [itens, setItens] = useState<Inadimplencia[]>([]);
  const [cliente, setCliente] = useState<Pick<Cliente, "id" | "nome" | "cpf" | "email" | "celular" | "telefone"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [inadimplenciaParaCancelar, setInadimplenciaParaCancelar] = useState<{ item: Inadimplencia; nomeCliente: string } | null>(null);
  const [modalPagamento, setModalPagamento] = useState<{
    tipo: "total" | "parcial";
    inadimplencia: Inadimplencia;
    nomeCliente: string;
    descontoDigitado: string;
    valorParcialDigitado: string;
    metodoPagamento: string;
    observacao: string;
    dataPagamento: string;
  } | null>(null);
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);
  const [modalCobrancaCanal, setModalCobrancaCanal] = useState<{ inadimplencia: Inadimplencia } | null>(null);
  const [loadingCobrancaCanal, setLoadingCobrancaCanal] = useState(false);
  const [gerandoPdfConsolidado, setGerandoPdfConsolidado] = useState(false);
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 12;

  const nomeCliente = cliente?.nome ?? itens.find((i) => isInadimplenciaEmAberto(i))?.clienteNome ?? `Cliente #${clienteId}`;

  const listar = useCallback(async (opts?: { silent?: boolean }) => {
    if (!clienteId) return;
    const silent = opts?.silent === true;
    try {
      if (!silent) setLoading(true);
      setErro(null);
      const r = await api.get("/api/inadimplentes", { params: { paginado: false } });
      const rawList = normalizeListResponse<Record<string, unknown>>(r.data);
      const todos = isMockEnabled()
        ? (rawList as Inadimplencia[])
        : rawList.map((item) => normalizeInadimplenciaFromApi(item));
      const doCliente = todos
        .filter((i) => i.clienteId === clienteId && !isInadimplenciaCancelada(i))
        .sort((a, b) => b.vencimento.localeCompare(a.vencimento));
      setItens(doCliente);
    } catch (e: unknown) {
      if (!silent) setErro(getApiErrorMessage(e, "Falha ao carregar honorários"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    if (!clienteId) return;
    void (async () => {
      try {
        const r = await api.get("/api/clientes", { params: { page: 0, size: 500 } });
        const list = normalizeListResponse<Record<string, unknown>>(r.data);
        const found = list
          .map((c) => normalizeClienteFromApi(c))
          .find((c) => c.id === clienteId);
        if (found) {
          setCliente({
            id: found.id ?? "",
            nome: found.nome,
            cpf: found.cpf,
            email: found.email,
            celular: found.celular,
            telefone: found.telefone,
          });
        }
      } catch {
        setCliente(null);
      }
    })();
    void listar();
  }, [clienteId, listar]);

  useEffect(() => {
    setPagina(1);
  }, [clienteId]);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 4000);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  function descontoNormalizado(valorDigitado: string, saldo: number): number {
    const descontoLido = parseValorReais(valorDigitado);
    if (!Number.isFinite(descontoLido) || descontoLido <= 0) return 0;
    if (descontoLido >= saldo) return saldo;
    return descontoLido;
  }

  function abrirModalPagamento(i: Inadimplencia, tipo: "total" | "parcial" = "total") {
    setModalPagamento({
      tipo,
      inadimplencia: i,
      nomeCliente,
      descontoDigitado: "",
      valorParcialDigitado: "",
      metodoPagamento: tipo === "parcial" ? "PIX" : "",
      observacao: "",
      dataPagamento: new Date().toISOString().slice(0, 10),
    });
  }

  async function salvarPagamentoModal() {
    if (!modalPagamento) return;
    const i = modalPagamento.inadimplencia;
    if (!i.id) {
      setErro("Não foi possível registrar: ID da inadimplência ausente.");
      return;
    }

    if (modalPagamento.tipo === "total" && !modalPagamento.metodoPagamento.trim()) {
      setErro("Método de pagamento é obrigatório.");
      return;
    }

    if (modalPagamento.tipo === "parcial") {
      const saldo = saldoDevedorItem(i);
      const valorReais = parseValorReais(modalPagamento.valorParcialDigitado);
      if (!valorReais || valorReais <= 0) {
        setErro("Informe um valor maior que zero para o pagamento parcial.");
        return;
      }
      if (valorReais > saldo) {
        setErro("Valor não pode ser maior que o saldo devedor.");
        return;
      }
    }

    setSalvandoPagamento(true);
    setErro(null);

    try {
      const confirmadoPor = getUsuarioLogadoLabel() || undefined;
      const comprovanteUsuario = confirmadoPor ? encodeConfirmadoPorComprovante(confirmadoPor) : undefined;

      if (modalPagamento.tipo === "total") {
        const saldo = saldoDevedorItem(i);
        const desconto = descontoNormalizado(modalPagamento.descontoDigitado, saldo);
        const metodoPagamento = modalPagamento.metodoPagamento.trim();
        const observacaoUsuario = modalPagamento.observacao.trim();
        const dataPagamento = modalPagamento.dataPagamento || new Date().toISOString().slice(0, 10);
        const valorRecebido = Math.max(0, saldo - desconto);
        const observacao = [
          observacaoUsuario || undefined,
          confirmadoPor ? `Confirmado por: ${confirmadoPor}` : undefined,
        ]
          .filter(Boolean)
          .join("\n");

        // Registra o pagamento (com quem confirmou) antes de quitar —
        // igual ao parcial; depois do PATCH muitos backends rejeitam novo POST.
        if (valorRecebido > 0) {
          await api.post("/api/pagamentos", {
            dividaId: i.id,
            valorPago: Math.round(valorRecebido * 100),
            dataPagamento,
            metodoPagamento,
            confirmadoPor,
            comprovante: comprovanteUsuario,
          });
        }

        await api.patch(`/api/inadimplentes/${i.id}`, {
          status: "Pago",
          desconto,
          metodoPagamento,
          observacao: observacao || undefined,
          dataPagamento,
          confirmadoPor,
          registradoPor: confirmadoPor,
        });
        setMensagemSucesso("Pagamento total confirmado com sucesso.");
      } else {
        const valorReais = parseValorReais(modalPagamento.valorParcialDigitado);
        await api.post("/api/pagamentos", {
          dividaId: i.id,
          valorPago: Math.round(valorReais * 100),
          dataPagamento: modalPagamento.dataPagamento || new Date().toISOString().slice(0, 10),
          metodoPagamento: modalPagamento.metodoPagamento || "PIX",
          confirmadoPor,
          comprovante: comprovanteUsuario,
        });
        setMensagemSucesso("Pagamento parcial registrado com sucesso.");
      }
      setModalPagamento(null);
      invalidateDashboard();
      await listar();
    } catch (e: unknown) {
      setErro(
        getApiErrorMessage(
          e,
          modalPagamento.tipo === "total"
            ? "Não foi possível confirmar o pagamento."
            : "Não foi possível registrar o pagamento parcial."
        )
      );
    } finally {
      setSalvandoPagamento(false);
    }
  }

  async function executarCancelamento() {
    if (!inadimplenciaParaCancelar?.item.id) return;
    const id = inadimplenciaParaCancelar.item.id;
    setInadimplenciaParaCancelar(null);
    try {
      setErro(null);
      await api.delete(`/api/inadimplentes/${id}`);
      setMensagemSucesso("Inadimplência cancelada.");
      invalidateDashboard();
      await listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao cancelar inadimplência"));
    }
  }

  function emailClienteValido(): string {
    return (cliente?.email ?? "").trim();
  }

  async function abrirCobrancaPorEmail(item: Inadimplencia) {
    const email = emailClienteValido();
    if (!email) {
      setErro("Cadastre o e-mail do cliente para enviar a cobrança.");
      return;
    }
    setLoadingCobrancaCanal(true);
    setErro(null);
    try {
      await gerarEBaixarAvisoPendenciaPdf(item, nomeCliente);
      await copyCobrancaEmailToClipboard(item, nomeCliente);
      try {
        await navigator.clipboard.writeText(email);
      } catch {
        // HTML do e-mail já foi copiado acima; e-mail do cliente fica no toast
      }
      window.open(ZOHO_MAIL_URL, "_blank", "noopener,noreferrer");
      setModalCobrancaCanal(null);
      setMensagemSucesso(
        `PDF baixado e Zoho aberto. Destinatário: ${email}. Crie um novo e-mail, cole o destinatário, anexe o PDF e envie.`
      );
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao gerar o PDF ou abrir o Zoho Mail."));
    } finally {
      setLoadingCobrancaCanal(false);
    }
  }

  async function enviarCobrancaPorWhatsApp(item: Inadimplencia) {
    const telefone = cliente?.celular || cliente?.telefone;
    if (!normalizeTelefoneParaWhatsApp(telefone)) {
      setErro("Cadastre o celular ou telefone do cliente para abrir o WhatsApp com o contato correto.");
      return;
    }
    setLoadingCobrancaCanal(true);
    setErro(null);
    try {
      const url = buildWhatsAppCobrancaUrl(item, nomeCliente, telefone);
      openWhatsAppCobranca(url);
      setModalCobrancaCanal(null);
      setMensagemSucesso("WhatsApp aberto com a mensagem de cobrança.");
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao abrir o WhatsApp."));
    } finally {
      setLoadingCobrancaCanal(false);
    }
  }

  function fecharModalCobrancaCanal() {
    if (loadingCobrancaCanal) return;
    setModalCobrancaCanal(null);
  }

  async function gerarPdfTodasCobrancas() {
    const emAberto = itens.filter(isInadimplenciaEmAberto);
    if (emAberto.length === 0) {
      setErro("Não há honorários em aberto para gerar o PDF.");
      return;
    }
    setGerandoPdfConsolidado(true);
    setErro(null);
    try {
      await gerarEBaixarAvisoPendenciaPdf(emAberto, nomeCliente);
      setMensagemSucesso(
        emAberto.length === 1
          ? "PDF do aviso de pendência baixado."
          : `PDF consolidado baixado com ${emAberto.length} períodos em aberto.`
      );
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao gerar o PDF consolidado."));
    } finally {
      setGerandoPdfConsolidado(false);
    }
  }

  const totalEmAberto = itens.filter(isInadimplenciaEmAberto).reduce((s, i) => s + saldoDevedorItem(i), 0);
  const qtdEmAberto = itens.filter(isInadimplenciaEmAberto).length;
  const maiorAtraso = itens
    .filter(isInadimplenciaEmAberto)
    .reduce((max, i) => Math.max(max, diasEmAtraso(i.vencimento)), 0);
  const totalPaginasHonorarios = Math.max(1, Math.ceil(itens.length / itensPorPagina));
  const paginaAtualHonorarios = Math.min(pagina, totalPaginasHonorarios);
  const itensPaginaHonorarios = itens.slice(
    (paginaAtualHonorarios - 1) * itensPorPagina,
    paginaAtualHonorarios * itensPorPagina
  );

  useEffect(() => {
    if (pagina > totalPaginasHonorarios && totalPaginasHonorarios >= 1) setPagina(1);
  }, [itens.length, totalPaginasHonorarios, pagina]);

  if (!clienteId) {
    return (
      <div className="page-inadimplentes page-inadimplentes--honorarios">
        <p className="page-inadimplentes__erro">Cliente não informado.</p>
        <Link to="/inadimplentes" className="page-inadimplentes-honorarios__voltar-link">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  return (
    <div className="page-inadimplentes page-inadimplentes--honorarios">
      <Link to="/inadimplentes" className="page-inadimplentes-honorarios__voltar">
        <ArrowLeftIcon />
        Voltar para inadimplentes
      </Link>

      <p className="page-inadimplentes__contexto">Sistema de Gestão de Inadimplentes</p>

      <header className="page-inadimplentes-honorarios__header">
        <div>
          <h1 className="page-inadimplentes__title">Honorários em aberto</h1>
          <p className="page-inadimplentes-honorarios__cliente-nome">{nomeCliente}</p>
        </div>
        {(cliente?.email || cliente?.cpf) && (
          <div className="page-inadimplentes-honorarios__cliente-meta">
            {cliente?.cpf && <span>{formatCpfCnpj(cliente.cpf)}</span>}
            {cliente?.email && <span>{cliente.email}</span>}
          </div>
        )}
      </header>

      {mensagemSucesso && <p className="toast toast--sucesso">{mensagemSucesso}</p>}
      {erro && <p className="page-inadimplentes__erro">{erro}</p>}

      <div className="page-inadimplentes__cards page-inadimplentes-honorarios__cards">
        <div className="page-inadimplentes__card">
          <span className="page-inadimplentes__card-label">Honorários em aberto</span>
          <span className="page-inadimplentes__card-value">{loading ? "—" : qtdEmAberto}</span>
        </div>
        <div className="page-inadimplentes__card">
          <span className="page-inadimplentes__card-label">Total em aberto</span>
          <span className="page-inadimplentes__card-value">{loading ? "—" : formatarMoeda(totalEmAberto)}</span>
        </div>
        <div className="page-inadimplentes__card">
          <span className="page-inadimplentes__card-label">Maior atraso</span>
          <span className="page-inadimplentes__card-value">{loading ? "—" : `${maiorAtraso} dias`}</span>
        </div>
      </div>

      <section className="page-inadimplentes-honorarios__secao">
        <div className="page-inadimplentes-honorarios__secao-topo">
          <h2 className="page-inadimplentes__tabela-titulo">Detalhamento por período</h2>
          {!loading && qtdEmAberto > 0 && (
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => void gerarPdfTodasCobrancas()}
              disabled={gerandoPdfConsolidado}
              title="Gera um PDF com todos os períodos em aberto"
            >
              {gerandoPdfConsolidado ? "Gerando PDF…" : "Gerar PDF (todas em aberto)"}
            </button>
          )}
        </div>

        {loading ? (
          <p className="page-inadimplentes__loading">Carregando honorários...</p>
        ) : itens.length === 0 ? (
          <div className="page-inadimplentes-honorarios__vazio">
            <p>Nenhum honorário em aberto para este cliente.</p>
            <button type="button" className="btn btn--primary" onClick={() => navigate("/inadimplentes")}>
              Voltar para a lista
            </button>
          </div>
        ) : (
          <>
          <div className="page-inadimplentes__tabela-wrap page-inadimplentes-honorarios__tabela-wrap">
            <table className="page-inadimplentes__tabela page-inadimplentes-honorarios__tabela">
              <thead>
                <tr>
                  <th>Mês/Ano</th>
                  <th>Descrição</th>
                  <th className="page-inadimplentes__cell-num">Valor</th>
                  <th>Status</th>
                  <th className="page-inadimplentes__th-acao">Ação</th>
                </tr>
              </thead>
              <tbody>
                {itensPaginaHonorarios.map((i) => {
                  const key = i.id ?? `${i.vencimento}-${i.valor}`;
                  const { valorTotal } = valoresHonorario(i);
                  const status = statusPagamentoHonorario(i);
                  const statusClass =
                    status === "Pago"
                      ? "page-inadimplentes-honorarios__status--pago"
                      : status === "Parcial"
                        ? "page-inadimplentes-honorarios__status--parcial"
                        : "page-inadimplentes-honorarios__status--aberto";

                  return (
                      <tr key={key} className="page-inadimplentes-honorarios__linha">
                        <td>{formatarMesAno(i.vencimento)}</td>
                        <td className="page-inadimplentes-honorarios__descricao" title={i.descricao?.trim() || undefined}>
                          {i.descricao?.trim() || "—"}
                        </td>
                        <td className="page-inadimplentes__cell-num">{formatarMoeda(valorTotal)}</td>
                        <td>
                          <span className={`page-inadimplentes-honorarios__status ${statusClass}`}>{status}</span>
                        </td>
                        <td>
                          {isInadimplenciaEmAberto(i) ? (
                            <div className="page-inadimplentes__acoes-detalhe page-inadimplentes-honorarios__acoes-linha">
                              <button
                                type="button"
                                className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--confirmar"
                                onClick={() => i.id != null && abrirModalPagamento(i)}
                                disabled={i.id == null || valorTotal <= 0}
                                title="Registrar pagamento"
                                aria-label="Registrar pagamento"
                              >
                                <CheckIcon />
                              </button>
                              <button
                                type="button"
                                className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--email"
                                onClick={() => setModalCobrancaCanal({ inadimplencia: i })}
                                title="Enviar cobrança"
                                aria-label="Enviar cobrança"
                              >
                                <EmailSendIcon />
                              </button>
                              <button
                                type="button"
                                className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--cancelar"
                                onClick={() => setInadimplenciaParaCancelar({ item: i, nomeCliente })}
                                disabled={i.id == null}
                                title="Cancelar inadimplência"
                                aria-label="Cancelar inadimplência"
                              >
                                <CancelIcon />
                              </button>
                            </div>
                          ) : (
                            <span className="page-inadimplentes-honorarios__sem-acao">—</span>
                          )}
                        </td>
                      </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {itens.length > itensPorPagina && (
            <div className="page-inadimplentes__paginacao page-inadimplentes-honorarios__paginacao">
              <button
                type="button"
                className="btn btn--secondary btn--small"
                disabled={paginaAtualHonorarios <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
          <span className="page-inadimplentes__paginacao-info">
            Página {paginaAtualHonorarios} de {totalPaginasHonorarios} ({itens.length} período
            {itens.length !== 1 ? "s" : ""})
          </span>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                disabled={paginaAtualHonorarios >= totalPaginasHonorarios}
                onClick={() => setPagina((p) => Math.min(totalPaginasHonorarios, p + 1))}
              >
                Próxima
              </button>
            </div>
          )}
          </>
        )}

        {!loading && itens.length > 0 && (
          <p className="page-inadimplentes-honorarios__total-geral">
            Total geral em aberto: <strong>{formatarMoeda(totalEmAberto)}</strong>
          </p>
        )}
      </section>

      {modalCobrancaCanal && (
        <div className="modal-overlay" onClick={fecharModalCobrancaCanal}>
          <div className="modal modal--cadastro modal--pagamento" onClick={(e) => e.stopPropagation()}>
            <p className="modal__eyebrow">ENVIAR COBRANÇA</p>
            <h2 className="modal__titulo">{nomeCliente}</h2>
            <p className="modal__texto-confirmacao modal__label--full">
              Mês: <strong>{formatarMesAno(modalCobrancaCanal.inadimplencia.vencimento)}</strong>{" "}
              Vencimento: <strong>{formatarData(modalCobrancaCanal.inadimplencia.vencimento)}</strong>
            </p>

            <p className="modal-cobranca-canal__pergunta">Como deseja enviar a cobrança?</p>
            <div className="modal-pagamento__tipo-tabs modal-cobranca-canal__opcoes">
              <button
                type="button"
                className="modal-pagamento__tipo-tab"
                onClick={() => void abrirCobrancaPorEmail(modalCobrancaCanal.inadimplencia)}
                disabled={loadingCobrancaCanal || !emailClienteValido()}
                title={
                  !emailClienteValido()
                    ? "Cadastre o e-mail do cliente"
                    : `Baixa PDF e abre o Zoho Mail para enviar a ${emailClienteValido()}`
                }
              >
                <span className="modal-pagamento__tipo-icone modal-pagamento__tipo-icone--email">
                  <EmailSendIcon />
                </span>
                <span className="modal-pagamento__tipo-texto">
                  <strong>{loadingCobrancaCanal ? "Gerando PDF…" : "Abrir Zoho Mail"}</strong>
                  <small>
                    {emailClienteValido()
                      ? `Baixa PDF e abre Zoho — destinatário ${emailClienteValido()}`
                      : "Cliente sem e-mail cadastrado"}
                  </small>
                </span>
              </button>
              <button
                type="button"
                className="modal-pagamento__tipo-tab"
                onClick={() => void enviarCobrancaPorWhatsApp(modalCobrancaCanal.inadimplencia)}
                disabled={
                  loadingCobrancaCanal ||
                  !normalizeTelefoneParaWhatsApp(cliente?.celular || cliente?.telefone)
                }
                title={
                  !normalizeTelefoneParaWhatsApp(cliente?.celular || cliente?.telefone)
                    ? "Cadastre celular ou telefone do cliente"
                    : undefined
                }
              >
                <span className="modal-pagamento__tipo-icone modal-pagamento__tipo-icone--whatsapp">
                  <WhatsAppIcon />
                </span>
                <span className="modal-pagamento__tipo-texto">
                  <strong>WhatsApp</strong>
                  <small>
                    {normalizeTelefoneParaWhatsApp(cliente?.celular || cliente?.telefone)
                      ? `Abre conversa com ${cliente?.celular || cliente?.telefone}`
                      : "Cliente sem telefone cadastrado"}
                  </small>
                </span>
              </button>
            </div>
            <div className="modal__botoes">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={fecharModalCobrancaCanal}
                disabled={loadingCobrancaCanal}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {inadimplenciaParaCancelar && (
        <div className="modal-overlay" onClick={() => setInadimplenciaParaCancelar(null)}>
          <div className="modal modal--confirmar-exclusao" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__titulo">Apagar inadimplência?</h2>
            <p className="modal__texto-confirmacao">
              Tem certeza que deseja apagar a inadimplência do mês{" "}
              <strong>{formatarMesAno(inadimplenciaParaCancelar.item.vencimento)}</strong> do cliente{" "}
              <strong>{inadimplenciaParaCancelar.nomeCliente}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="modal__botoes">
              <button type="button" className="btn btn--secondary" onClick={() => setInadimplenciaParaCancelar(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn--danger" onClick={() => void executarCancelamento()}>
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalPagamento && (() => {
        const i = modalPagamento.inadimplencia;
        const saldo = saldoDevedorItem(i);
        const desconto = descontoNormalizado(modalPagamento.descontoDigitado, saldo);
        const { valorOriginal, juros } = valoresHonorario(i);
        const valorParcial = parseValorReais(modalPagamento.valorParcialDigitado);
        const totalReceber =
          modalPagamento.tipo === "total"
            ? Math.max(0, saldo - desconto)
            : Math.max(0, valorParcial);
        const saldoRestante =
          modalPagamento.tipo === "parcial" && valorParcial > 0
            ? Math.max(0, saldo - valorParcial)
            : null;
        const descricaoPeriodo = (i.descricao || "").trim();

        return (
          <div className="modal-overlay" onClick={() => !salvandoPagamento && setModalPagamento(null)}>
            <div
              className="modal modal--pagamento modal-pagamento-registro"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-pagamento-titulo"
            >
              <header className="modal-pagamento-registro__header">
                <p className="page-inadimplentes__contexto">Sistema de Gestão de Inadimplentes</p>
                <h2 id="modal-pagamento-titulo" className="modal-pagamento-registro__titulo">
                  Registrar pagamento
                </h2>
                <p className="modal-pagamento-registro__subtitle">
                  Confirme o recebimento dos honorários em aberto deste período.
                </p>
              </header>

              <div className="modal-pagamento-registro__layout">
                <div className="modal-pagamento-registro__principal">
                  <section className="registro-inadimplencia__card">
                    <div className="registro-inadimplencia__card-head">
                      <span className="registro-inadimplencia__step">1</span>
                      <div>
                        <h3 className="registro-inadimplencia__card-title">Tipo de pagamento</h3>
                        <p className="registro-inadimplencia__card-desc">
                          Escolha se o valor quita a dívida ou apenas parte dela.
                        </p>
                      </div>
                    </div>

                    <div className="modal-pagamento__tipo-tabs" role="tablist" aria-label="Tipo de pagamento">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={modalPagamento.tipo === "total"}
                        className={`modal-pagamento__tipo-tab${modalPagamento.tipo === "total" ? " modal-pagamento__tipo-tab--ativo" : ""}`}
                        onClick={() =>
                          setModalPagamento((prev) =>
                            prev ? { ...prev, tipo: "total", metodoPagamento: prev.metodoPagamento || "" } : prev
                          )
                        }
                        disabled={salvandoPagamento}
                      >
                        <span className="modal-pagamento__tipo-icone modal-pagamento__tipo-icone--total">
                          <CheckIcon />
                        </span>
                        <span className="modal-pagamento__tipo-texto">
                          <strong>Pagamento total</strong>
                          <small>Quita a dívida por completo</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={modalPagamento.tipo === "parcial"}
                        className={`modal-pagamento__tipo-tab${modalPagamento.tipo === "parcial" ? " modal-pagamento__tipo-tab--ativo" : ""}`}
                        onClick={() =>
                          setModalPagamento((prev) =>
                            prev ? { ...prev, tipo: "parcial", metodoPagamento: prev.metodoPagamento || "PIX" } : prev
                          )
                        }
                        disabled={salvandoPagamento}
                      >
                        <span className="modal-pagamento__tipo-icone modal-pagamento__tipo-icone--parcial">R$</span>
                        <span className="modal-pagamento__tipo-texto">
                          <strong>Pagamento parcial</strong>
                          <small>Registra apenas parte do valor</small>
                        </span>
                      </button>
                    </div>
                  </section>

                  <section className="registro-inadimplencia__card">
                    <div className="registro-inadimplencia__card-head">
                      <span className="registro-inadimplencia__step">2</span>
                      <div>
                        <h3 className="registro-inadimplencia__card-title">Dados do pagamento</h3>
                        <p className="registro-inadimplencia__card-desc">
                          {modalPagamento.tipo === "total"
                            ? "Informe desconto, método, data e observação do recebimento."
                            : "Informe o valor parcial, data e método de pagamento."}
                        </p>
                      </div>
                    </div>

                    <div className="modal-pagamento-registro__campos">
                      {modalPagamento.tipo === "total" ? (
                        <>
                          <div className="modal-pagamento-registro__linha-tres">
                            <div className="modal-pagamento-registro__campo">
                              <label className="registro-inadimplencia__label" htmlFor="pag-desconto">
                                Desconto (R$)
                              </label>
                              <input
                                id="pag-desconto"
                                placeholder="0,00"
                                value={modalPagamento.descontoDigitado}
                                onChange={(e) =>
                                  setModalPagamento((prev) =>
                                    prev ? { ...prev, descontoDigitado: e.target.value } : prev
                                  )
                                }
                                className="registro-inadimplencia__input"
                                disabled={salvandoPagamento}
                              />
                            </div>
                            <div className="modal-pagamento-registro__campo">
                              <label className="registro-inadimplencia__label" htmlFor="pag-metodo-total">
                                Método de pagamento <span className="registro-inadimplencia__required">*</span>
                              </label>
                              <select
                                id="pag-metodo-total"
                                value={modalPagamento.metodoPagamento}
                                onChange={(e) =>
                                  setModalPagamento((prev) =>
                                    prev ? { ...prev, metodoPagamento: e.target.value } : prev
                                  )
                                }
                                className="registro-inadimplencia__select"
                                disabled={salvandoPagamento}
                              >
                                <option value="">Selecione</option>
                                <option value="PIX">PIX</option>
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Cartão">Cartão</option>
                                <option value="Transferência">Transferência</option>
                                <option value="Boleto">Boleto</option>
                              </select>
                            </div>
                            <div className="modal-pagamento-registro__campo">
                              <label className="registro-inadimplencia__label" htmlFor="pag-data-total">
                                Data do pagamento
                              </label>
                              <input
                                id="pag-data-total"
                                type="date"
                                value={modalPagamento.dataPagamento}
                                onChange={(e) =>
                                  setModalPagamento((prev) =>
                                    prev ? { ...prev, dataPagamento: e.target.value } : prev
                                  )
                                }
                                className="registro-inadimplencia__input"
                                disabled={salvandoPagamento}
                              />
                            </div>
                          </div>
                          <div className="modal-pagamento-registro__campo">
                            <label className="registro-inadimplencia__label" htmlFor="pag-obs">
                              Observação
                              <span className="registro-inadimplencia__descricao-opcional"> (opcional)</span>
                            </label>
                            <textarea
                              id="pag-obs"
                              placeholder="Ex.: Pagamento confirmado via extrato bancário"
                              value={modalPagamento.observacao}
                              onChange={(e) =>
                                setModalPagamento((prev) =>
                                  prev ? { ...prev, observacao: e.target.value } : prev
                                )
                              }
                              className="registro-inadimplencia__textarea"
                              rows={2}
                              disabled={salvandoPagamento}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="modal-pagamento-registro__campo">
                            <label className="registro-inadimplencia__label" htmlFor="pag-valor-parcial">
                              Valor a pagar agora <span className="registro-inadimplencia__required">*</span>
                            </label>
                            <input
                              id="pag-valor-parcial"
                              placeholder="0,00"
                              value={modalPagamento.valorParcialDigitado}
                              onChange={(e) =>
                                setModalPagamento((prev) =>
                                  prev ? { ...prev, valorParcialDigitado: e.target.value } : prev
                                )
                              }
                              className="registro-inadimplencia__input"
                              disabled={salvandoPagamento}
                            />
                          </div>
                          <div className="modal-pagamento-registro__linha-dois">
                            <div className="modal-pagamento-registro__campo">
                              <label className="registro-inadimplencia__label" htmlFor="pag-data-parcial">
                                Data do pagamento
                              </label>
                              <input
                                id="pag-data-parcial"
                                type="date"
                                value={modalPagamento.dataPagamento}
                                onChange={(e) =>
                                  setModalPagamento((prev) =>
                                    prev ? { ...prev, dataPagamento: e.target.value } : prev
                                  )
                                }
                                className="registro-inadimplencia__input"
                                disabled={salvandoPagamento}
                              />
                            </div>
                            <div className="modal-pagamento-registro__campo">
                              <label className="registro-inadimplencia__label" htmlFor="pag-metodo-parcial">
                                Método de pagamento
                              </label>
                              <select
                                id="pag-metodo-parcial"
                                value={modalPagamento.metodoPagamento}
                                onChange={(e) =>
                                  setModalPagamento((prev) =>
                                    prev ? { ...prev, metodoPagamento: e.target.value } : prev
                                  )
                                }
                                className="registro-inadimplencia__select"
                                disabled={salvandoPagamento}
                              >
                                <option value="PIX">PIX</option>
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Cartão">Cartão</option>
                                <option value="Transferência">Transferência</option>
                                <option value="Boleto">Boleto</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                </div>

                <aside className="modal-pagamento-registro__sidebar">
                  <div className="registro-inadimplencia__resumo">
                    <h3 className="registro-inadimplencia__resumo-titulo">Resumo do pagamento</h3>
                    <dl className="registro-inadimplencia__resumo-lista">
                      <div className="registro-inadimplencia__resumo-item">
                        <dt>Cliente</dt>
                        <dd>{modalPagamento.nomeCliente}</dd>
                      </div>
                      <div className="registro-inadimplencia__resumo-item">
                        <dt>Período</dt>
                        <dd>{formatarMesAno(i.vencimento)}</dd>
                      </div>
                      <div className="registro-inadimplencia__resumo-item">
                        <dt>Vencimento</dt>
                        <dd>{formatarData(i.vencimento)}</dd>
                      </div>
                      {descricaoPeriodo ? (
                        <div className="registro-inadimplencia__resumo-item">
                          <dt>Descrição</dt>
                          <dd>{descricaoPeriodo}</dd>
                        </div>
                      ) : null}
                      <div className="registro-inadimplencia__resumo-item">
                        <dt>Valor original</dt>
                        <dd>{formatarMoeda(valorOriginal)}</dd>
                      </div>
                      <div className="registro-inadimplencia__resumo-item">
                        <dt>Juros</dt>
                        <dd>{formatarMoeda(juros)}</dd>
                      </div>
                      <div className="registro-inadimplencia__resumo-item">
                        <dt>Saldo devedor</dt>
                        <dd>{formatarMoeda(saldo)}</dd>
                      </div>
                      {modalPagamento.tipo === "total" && desconto > 0 ? (
                        <div className="registro-inadimplencia__resumo-item">
                          <dt>Desconto</dt>
                          <dd>−{formatarMoeda(desconto)}</dd>
                        </div>
                      ) : null}
                      {saldoRestante != null ? (
                        <div className="registro-inadimplencia__resumo-item">
                          <dt>Saldo restante</dt>
                          <dd>{formatarMoeda(saldoRestante)}</dd>
                        </div>
                      ) : null}
                      <div className="registro-inadimplencia__resumo-item registro-inadimplencia__resumo-item--total">
                        <dt>{modalPagamento.tipo === "total" ? "Total a receber" : "Valor deste pagamento"}</dt>
                        <dd>{formatarMoeda(totalReceber)}</dd>
                      </div>
                    </dl>

                    <div className="registro-inadimplencia__acoes">
                      <button
                        type="button"
                        className="btn btn--primary registro-inadimplencia__btn-salvar"
                        onClick={() => void salvarPagamentoModal()}
                        disabled={
                          salvandoPagamento ||
                          (modalPagamento.tipo === "total" && !modalPagamento.metodoPagamento.trim()) ||
                          (modalPagamento.tipo === "parcial" && valorParcial <= 0)
                        }
                      >
                        {salvandoPagamento
                          ? "Salvando..."
                          : modalPagamento.tipo === "total"
                            ? "Confirmar pagamento total"
                            : "Registrar pagamento parcial"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary registro-inadimplencia__btn-cancelar"
                        onClick={() => setModalPagamento(null)}
                        disabled={salvandoPagamento}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        );
      })()}
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

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function EmailSendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      <path d="M16 14h6" />
      <path d="m19 11 3 3-3 3" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
