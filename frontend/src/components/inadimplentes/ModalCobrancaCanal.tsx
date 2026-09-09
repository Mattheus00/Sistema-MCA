import { createPortal } from "react-dom";
import { EmailSendIcon } from "@/components/inadimplentes/HonorariosIcons";
import { WhatsAppIcon } from "@/components/inadimplentes/IconeWhatsApp";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { formatarData, formatarMesAno } from "@/lib/inadimplentesUtils";
import { normalizeTelefoneParaWhatsApp } from "@/lib/mailtoCobranca";
import type { Inadimplencia } from "@/types/api";

type ModalCobrancaCanalProps = {
  nomeCliente: string;
  inadimplencia: Inadimplencia;
  loadingCobrancaCanal: boolean;
  emailCliente: string;
  telefone: string | undefined;
  abrirCobrancaPorEmail: (item: Inadimplencia) => void;
  enviarCobrancaPorWhatsApp: (item: Inadimplencia) => void;
  fecharModalCobrancaCanal: () => void;
};

export default function ModalCobrancaCanal({
  nomeCliente,
  inadimplencia,
  loadingCobrancaCanal,
  emailCliente,
  telefone,
  abrirCobrancaPorEmail,
  enviarCobrancaPorWhatsApp,
  fecharModalCobrancaCanal,
}: ModalCobrancaCanalProps) {
  useBodyScrollLock(true);

  return createPortal(
    <div className="modal-overlay" onClick={fecharModalCobrancaCanal}>
      <div className="modal modal--cadastro modal--pagamento" onClick={(e) => e.stopPropagation()}>
        <p className="modal__eyebrow">ENVIAR COBRANÇA</p>
        <h2 className="modal__titulo">{nomeCliente}</h2>
        <p className="modal__texto-confirmacao modal__label--full">
          Mês: <strong>{formatarMesAno(inadimplencia.vencimento)}</strong> Vencimento:{" "}
          <strong>{formatarData(inadimplencia.vencimento)}</strong>
        </p>

        <p className="modal-cobranca-canal__pergunta">Como deseja enviar a cobrança?</p>
        <div className="modal-pagamento__tipo-tabs modal-cobranca-canal__opcoes">
          <button
            type="button"
            className="modal-pagamento__tipo-tab"
            onClick={() => void abrirCobrancaPorEmail(inadimplencia)}
            disabled={loadingCobrancaCanal || !emailCliente}
            title={
              !emailCliente
                ? "Cadastre o e-mail do cliente"
                : `Baixa PDF e abre o Zoho Mail para enviar a ${emailCliente}`
            }
          >
            <span className="modal-pagamento__tipo-icone modal-pagamento__tipo-icone--email">
              <EmailSendIcon />
            </span>
            <span className="modal-pagamento__tipo-texto">
              <strong>{loadingCobrancaCanal ? "Gerando PDF…" : "Abrir Zoho Mail"}</strong>
              <small>
                {emailCliente
                  ? `Baixa PDF e abre Zoho — destinatário ${emailCliente}`
                  : "Cliente sem e-mail cadastrado"}
              </small>
            </span>
          </button>
          <button
            type="button"
            className="modal-pagamento__tipo-tab"
            onClick={() => void enviarCobrancaPorWhatsApp(inadimplencia)}
            disabled={loadingCobrancaCanal || !normalizeTelefoneParaWhatsApp(telefone)}
            title={
              !normalizeTelefoneParaWhatsApp(telefone)
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
                {normalizeTelefoneParaWhatsApp(telefone)
                  ? `Abre conversa com ${telefone}`
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
    </div>,
    document.body,
  );
}
