import { createPortal } from "react-dom";
import { DownloadPdfIcon, EmailSendIcon } from "@/components/inadimplentes/HonorariosIcons";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

type ModalPdfConsolidadoProps = {
  nomeCliente: string;
  qtdEmAberto: number;
  emailCliente: string;
  gerandoPdfConsolidado: boolean;
  fecharModalPdfConsolidado: () => void;
  baixarPdfTodasCobrancas: () => void;
  enviarPdfTodasCobrancasPorEmail: () => void;
};

export default function ModalPdfConsolidado({
  nomeCliente,
  qtdEmAberto,
  emailCliente,
  gerandoPdfConsolidado,
  fecharModalPdfConsolidado,
  baixarPdfTodasCobrancas,
  enviarPdfTodasCobrancasPorEmail,
}: ModalPdfConsolidadoProps) {
  useBodyScrollLock(true);

  return createPortal(
    <div className="modal-overlay" onClick={fecharModalPdfConsolidado}>
      <div className="modal modal--cadastro modal--pagamento" onClick={(e) => e.stopPropagation()}>
        <p className="modal__eyebrow">AVISO DE PENDÊNCIA</p>
        <h2 className="modal__titulo">{nomeCliente}</h2>
        <p className="modal__texto-confirmacao modal__label--full">
          PDF consolidado com <strong>{qtdEmAberto}</strong> período
          {qtdEmAberto === 1 ? "" : "s"} em aberto
          {emailCliente ? (
            <>
              {" · "}Destino: <strong>{emailCliente}</strong>
            </>
          ) : null}
        </p>

        <p className="modal-cobranca-canal__pergunta">O que deseja fazer com o PDF?</p>
        <div className="modal-pagamento__tipo-tabs modal-cobranca-canal__opcoes">
          <button
            type="button"
            className="modal-pagamento__tipo-tab"
            onClick={() => void baixarPdfTodasCobrancas()}
            disabled={gerandoPdfConsolidado}
          >
            <span className="modal-pagamento__tipo-icone modal-pagamento__tipo-icone--email">
              <DownloadPdfIcon />
            </span>
            <span className="modal-pagamento__tipo-texto">
              <strong>{gerandoPdfConsolidado ? "Gerando PDF…" : "Só baixar PDF"}</strong>
              <small>Salva o arquivo no computador</small>
            </span>
          </button>
          <button
            type="button"
            className="modal-pagamento__tipo-tab"
            onClick={() => void enviarPdfTodasCobrancasPorEmail()}
            disabled={gerandoPdfConsolidado || !emailCliente}
            title={
              !emailCliente ? "Cadastre o e-mail do cliente" : `Envia o PDF para ${emailCliente}`
            }
          >
            <span className="modal-pagamento__tipo-icone modal-pagamento__tipo-icone--email">
              <EmailSendIcon />
            </span>
            <span className="modal-pagamento__tipo-texto">
              <strong>{gerandoPdfConsolidado ? "Enviando…" : "Enviar por e-mail"}</strong>
              <small>
                {emailCliente
                  ? `Envia automaticamente para ${emailCliente}`
                  : "Cadastre o e-mail do cliente"}
              </small>
            </span>
          </button>
        </div>
        <div className="modal__botoes">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={fecharModalPdfConsolidado}
            disabled={gerandoPdfConsolidado}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
