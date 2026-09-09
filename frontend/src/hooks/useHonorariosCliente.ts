import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getApiErrorMessage } from "@/lib/api";
import { obterCliente } from "@/lib/clientesApi";
import { cancelarInadimplencia, listarInadimplentes } from "@/lib/inadimplentesApi";
import { invalidateDashboard } from "@/lib/dashboardRefresh";
import { isInadimplenciaCancelada, isInadimplenciaEmAberto } from "@/lib/inadimplentesUtils";
import type { Inadimplencia } from "@/types/api";
import {
  executarBaixarPdfConsolidado,
  executarCobrancaPorEmail,
  executarCobrancaPorWhatsApp,
  executarEnviarPdfTodasCobrancasPorEmail,
  executarSalvarPagamento,
  telefoneClienteHonorarios,
} from "@/hooks/honorariosClienteActions";
import {
  ITENS_POR_PAGINA_HONORARIOS,
  emailClienteValidoDe,
  resumoHonorarios,
  type ClienteHonorarios,
  type InadimplenciaParaCancelar,
  type ModalCobrancaCanalState,
  type ModalPagamentoState,
} from "@/hooks/honorariosClienteTypes";

export function useHonorariosCliente() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  const [itens, setItens] = useState<Inadimplencia[]>([]);
  const [cliente, setCliente] = useState<ClienteHonorarios | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [inadimplenciaParaCancelar, setInadimplenciaParaCancelar] =
    useState<InadimplenciaParaCancelar | null>(null);
  const [modalPagamento, setModalPagamento] = useState<ModalPagamentoState | null>(null);
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);
  const [modalCobrancaCanal, setModalCobrancaCanal] = useState<ModalCobrancaCanalState | null>(
    null,
  );
  const [loadingCobrancaCanal, setLoadingCobrancaCanal] = useState(false);
  const [modalPdfConsolidado, setModalPdfConsolidado] = useState(false);
  const [gerandoPdfConsolidado, setGerandoPdfConsolidado] = useState(false);
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = ITENS_POR_PAGINA_HONORARIOS;
  const feedback = { setErro, setMensagemSucesso };

  const nomeCliente =
    cliente?.nome ??
    itens.find((i) => isInadimplenciaEmAberto(i))?.clienteNome ??
    `Cliente #${clienteId}`;

  const listar = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!clienteId) return;
      const silent = opts?.silent === true;
      try {
        if (!silent) setLoading(true);
        setErro(null);
        // Backend não expõe filtro por cliente (GET /api/inadimplentes?clienteId=): lista tudo e filtra.
        const todos = await listarInadimplentes();
        const doCliente = todos
          .filter((i) => i.clienteId === clienteId && !isInadimplenciaCancelada(i))
          .sort((a, b) => b.vencimento.localeCompare(a.vencimento));
        setItens(doCliente);
      } catch (e: unknown) {
        if (!silent) setErro(getApiErrorMessage(e, "Falha ao carregar honorários"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [clienteId],
  );

  useEffect(() => {
    if (!clienteId) return;
    void (async () => {
      try {
        const found = await obterCliente(clienteId);
        setCliente({
          id: found.id ?? clienteId,
          nome: found.nome,
          cpf: found.cpf,
          email: found.email,
          celular: found.celular,
          telefone: found.telefone,
        });
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

  function emailClienteValido(): string {
    return emailClienteValidoDe(cliente);
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
    await executarSalvarPagamento(
      modalPagamento,
      setSalvandoPagamento,
      setModalPagamento,
      listar,
      feedback,
    );
  }

  async function executarCancelamento() {
    if (!inadimplenciaParaCancelar?.item.id) return;
    const id = inadimplenciaParaCancelar.item.id;
    setInadimplenciaParaCancelar(null);
    try {
      setErro(null);
      await cancelarInadimplencia(String(id));
      setMensagemSucesso("Inadimplência cancelada.");
      invalidateDashboard();
      await listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao cancelar inadimplência"));
    }
  }

  async function abrirCobrancaPorEmail(item: Inadimplencia) {
    await executarCobrancaPorEmail(
      item,
      nomeCliente,
      emailClienteValido(),
      setLoadingCobrancaCanal,
      setModalCobrancaCanal,
      feedback,
    );
  }

  async function enviarCobrancaPorWhatsApp(item: Inadimplencia) {
    await executarCobrancaPorWhatsApp(
      item,
      nomeCliente,
      telefoneClienteHonorarios(cliente),
      setLoadingCobrancaCanal,
      setModalCobrancaCanal,
      feedback,
    );
  }

  function fecharModalCobrancaCanal() {
    if (loadingCobrancaCanal) return;
    setModalCobrancaCanal(null);
  }

  function abrirModalPdfConsolidado() {
    const emAberto = itens.filter(isInadimplenciaEmAberto);
    if (emAberto.length === 0) {
      setErro("Não há honorários em aberto para gerar o PDF.");
      return;
    }
    setErro(null);
    setModalPdfConsolidado(true);
  }

  function fecharModalPdfConsolidado() {
    if (gerandoPdfConsolidado) return;
    setModalPdfConsolidado(false);
  }

  async function baixarPdfTodasCobrancas() {
    await executarBaixarPdfConsolidado(
      itens,
      nomeCliente,
      setGerandoPdfConsolidado,
      setModalPdfConsolidado,
      feedback,
    );
  }

  async function enviarPdfTodasCobrancasPorEmail() {
    if (!clienteId) return;
    await executarEnviarPdfTodasCobrancasPorEmail(
      clienteId,
      itens,
      nomeCliente,
      emailClienteValido(),
      setGerandoPdfConsolidado,
      setModalPdfConsolidado,
      feedback,
    );
  }

  const { totalEmAberto, qtdEmAberto, maiorAtraso } = resumoHonorarios(itens);
  const totalPaginasHonorarios = Math.max(1, Math.ceil(itens.length / itensPorPagina));
  const paginaAtualHonorarios = Math.min(pagina, totalPaginasHonorarios);
  const itensPaginaHonorarios = itens.slice(
    (paginaAtualHonorarios - 1) * itensPorPagina,
    paginaAtualHonorarios * itensPorPagina,
  );

  useEffect(() => {
    if (pagina > totalPaginasHonorarios && totalPaginasHonorarios >= 1) setPagina(1);
  }, [itens.length, totalPaginasHonorarios, pagina]);

  return {
    clienteId,
    navigate,
    itens,
    cliente,
    loading,
    erro,
    mensagemSucesso,
    inadimplenciaParaCancelar,
    setInadimplenciaParaCancelar,
    modalPagamento,
    setModalPagamento,
    salvandoPagamento,
    modalCobrancaCanal,
    setModalCobrancaCanal,
    loadingCobrancaCanal,
    modalPdfConsolidado,
    gerandoPdfConsolidado,
    pagina,
    setPagina,
    itensPorPagina,
    nomeCliente,
    emailClienteValido,
    abrirModalPagamento,
    salvarPagamentoModal,
    executarCancelamento,
    abrirCobrancaPorEmail,
    enviarCobrancaPorWhatsApp,
    fecharModalCobrancaCanal,
    abrirModalPdfConsolidado,
    fecharModalPdfConsolidado,
    baixarPdfTodasCobrancas,
    enviarPdfTodasCobrancasPorEmail,
    totalEmAberto,
    qtdEmAberto,
    maiorAtraso,
    totalPaginasHonorarios,
    paginaAtualHonorarios,
    itensPaginaHonorarios,
  };
}
