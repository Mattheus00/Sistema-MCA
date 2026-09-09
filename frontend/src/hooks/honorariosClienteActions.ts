import type { Dispatch, SetStateAction } from "react";
import { getApiErrorMessage, getUsuarioLogadoLabel } from "@/lib/api";
import { encodeConfirmadoPorComprovante } from "@/lib/apiNormalizers";
import { gerarAvisoPendenciaPdfBlob, gerarEBaixarAvisoPendenciaPdf } from "@/lib/cobrancaPdf";
import { STATUS_ENVIO, statusEh } from "@/lib/constants/status";
import { invalidateDashboard } from "@/lib/dashboardRefresh";
import {
  confirmarPagamentoTotal,
  enviarAvisoPendencia,
  registrarPagamento,
} from "@/lib/inadimplentesApi";
import { isInadimplenciaEmAberto, saldoDevedorItem } from "@/lib/inadimplentesUtils";
import {
  buildWhatsAppCobrancaUrl,
  copyCobrancaEmailToClipboard,
  normalizeTelefoneParaWhatsApp,
  openWhatsAppCobranca,
} from "@/lib/mailtoCobranca";
import { parseValorReais } from "@/lib/valorBrasil";
import type { Inadimplencia } from "@/types/api";
import {
  descontoNormalizado,
  type ClienteHonorarios,
  type ModalPagamentoState,
} from "@/hooks/honorariosClienteTypes";

export const ZOHO_MAIL_URL = "https://mail.zoho.com/zm/#mail/folder/sent";

type Feedback = {
  setErro: Dispatch<SetStateAction<string | null>>;
  setMensagemSucesso: Dispatch<SetStateAction<string | null>>;
};

export async function executarSalvarPagamento(
  modalPagamento: ModalPagamentoState,
  setSalvandoPagamento: Dispatch<SetStateAction<boolean>>,
  setModalPagamento: Dispatch<SetStateAction<ModalPagamentoState | null>>,
  listar: (opts?: { silent?: boolean }) => Promise<void>,
  { setErro, setMensagemSucesso }: Feedback,
): Promise<void> {
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
    const comprovanteUsuario = confirmadoPor
      ? encodeConfirmadoPorComprovante(confirmadoPor)
      : undefined;

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
        await registrarPagamento({
          dividaId: i.id,
          valorPago: Math.round(valorRecebido * 100),
          dataPagamento,
          metodoPagamento,
          confirmadoPor,
          comprovante: comprovanteUsuario,
        });
      }

      await confirmarPagamentoTotal(String(i.id), {
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
      await registrarPagamento({
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
          : "Não foi possível registrar o pagamento parcial.",
      ),
    );
  } finally {
    setSalvandoPagamento(false);
  }
}

export async function executarCobrancaPorEmail(
  item: Inadimplencia,
  nomeCliente: string,
  email: string,
  setLoadingCobrancaCanal: Dispatch<SetStateAction<boolean>>,
  setModalCobrancaCanal: Dispatch<SetStateAction<{ inadimplencia: Inadimplencia } | null>>,
  { setErro, setMensagemSucesso }: Feedback,
): Promise<void> {
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
      `PDF baixado e Zoho aberto. Destinatário: ${email}. Crie um novo e-mail, cole o destinatário, anexe o PDF e envie.`,
    );
  } catch (e: unknown) {
    setErro(getApiErrorMessage(e, "Falha ao gerar o PDF ou abrir o Zoho Mail."));
  } finally {
    setLoadingCobrancaCanal(false);
  }
}

export async function executarCobrancaPorWhatsApp(
  item: Inadimplencia,
  nomeCliente: string,
  telefone: string | undefined,
  setLoadingCobrancaCanal: Dispatch<SetStateAction<boolean>>,
  setModalCobrancaCanal: Dispatch<SetStateAction<{ inadimplencia: Inadimplencia } | null>>,
  { setErro, setMensagemSucesso }: Feedback,
): Promise<void> {
  if (!normalizeTelefoneParaWhatsApp(telefone)) {
    setErro(
      "Cadastre o celular ou telefone do cliente para abrir o WhatsApp com o contato correto.",
    );
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

export async function executarBaixarPdfConsolidado(
  itens: Inadimplencia[],
  nomeCliente: string,
  setGerandoPdfConsolidado: Dispatch<SetStateAction<boolean>>,
  setModalPdfConsolidado: Dispatch<SetStateAction<boolean>>,
  { setErro, setMensagemSucesso }: Feedback,
): Promise<void> {
  const emAberto = itens.filter(isInadimplenciaEmAberto);
  if (emAberto.length === 0) {
    setErro("Não há honorários em aberto para gerar o PDF.");
    return;
  }
  setGerandoPdfConsolidado(true);
  setErro(null);
  try {
    await gerarEBaixarAvisoPendenciaPdf(emAberto, nomeCliente);
    setModalPdfConsolidado(false);
    setMensagemSucesso(
      emAberto.length === 1
        ? "PDF do aviso de pendência baixado."
        : `PDF consolidado baixado com ${emAberto.length} períodos em aberto.`,
    );
  } catch (e: unknown) {
    setErro(getApiErrorMessage(e, "Falha ao gerar o PDF consolidado."));
  } finally {
    setGerandoPdfConsolidado(false);
  }
}

export async function executarEnviarPdfTodasCobrancasPorEmail(
  clienteId: string,
  itens: Inadimplencia[],
  nomeCliente: string,
  email: string,
  setGerandoPdfConsolidado: Dispatch<SetStateAction<boolean>>,
  setModalPdfConsolidado: Dispatch<SetStateAction<boolean>>,
  { setErro, setMensagemSucesso }: Feedback,
): Promise<void> {
  if (!email) {
    setErro("Cadastre o e-mail do cliente para enviar o aviso.");
    return;
  }
  const emAberto = itens.filter(isInadimplenciaEmAberto);
  if (emAberto.length === 0) {
    setErro("Não há honorários em aberto para gerar o PDF.");
    return;
  }
  setGerandoPdfConsolidado(true);
  setErro(null);
  try {
    const { blob, filename } = await gerarAvisoPendenciaPdfBlob(emAberto, nomeCliente);
    const data = await enviarAvisoPendencia(clienteId, blob, filename);
    if (statusEh(data?.statusEnvio, STATUS_ENVIO.ENVIADO)) {
      setModalPdfConsolidado(false);
      setMensagemSucesso(`Aviso enviado para ${data.emailDestino ?? email}.`);
    } else {
      setErro(data?.mensagemErro?.trim() || "Falha ao enviar o e-mail.");
    }
  } catch (e: unknown) {
    setErro(getApiErrorMessage(e, "Falha ao enviar o e-mail."));
  } finally {
    setGerandoPdfConsolidado(false);
  }
}

export function telefoneClienteHonorarios(cliente: ClienteHonorarios | null): string | undefined {
  return cliente?.celular || cliente?.telefone;
}
