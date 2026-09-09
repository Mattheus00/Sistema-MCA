import { createPortal } from "react-dom";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

type ConfirmacaoModalProps = {
  mensagem: string;
  onCancelar: () => void;
  onConfirmar: () => void;
  textoCancelar?: string;
  textoConfirmar?: string;
};

export default function ConfirmacaoModal({
  mensagem,
  onCancelar,
  onConfirmar,
  textoCancelar = "Cancelar",
  textoConfirmar = "OK",
}: ConfirmacaoModalProps) {
  useBodyScrollLock(true);

  return createPortal(
    <ModalOverlay onDismiss={onCancelar}>
      <div
        className="modal modal--confirmar-exclusao"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmacao-modal-titulo"
      >
        <h2 id="confirmacao-modal-titulo" className="modal__titulo">
          {mensagem}
        </h2>
        <div className="modal__botoes">
          <button type="button" className="btn btn--secondary" onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </ModalOverlay>,
    document.body,
  );
}
