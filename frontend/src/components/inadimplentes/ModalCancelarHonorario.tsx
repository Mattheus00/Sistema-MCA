import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { formatarMesAno } from "@/lib/inadimplentesUtils";
import type { InadimplenciaParaCancelar } from "@/hooks/honorariosClienteTypes";

type ModalCancelarHonorarioProps = {
  inadimplenciaParaCancelar: InadimplenciaParaCancelar;
  onFechar: () => void;
  onConfirmar: () => void;
};

export default function ModalCancelarHonorario({
  inadimplenciaParaCancelar,
  onFechar,
  onConfirmar,
}: ModalCancelarHonorarioProps) {
  useBodyScrollLock(true);

  return createPortal(
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal modal--confirmar-exclusao" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__titulo">Apagar inadimplência?</h2>
        <p className="modal__texto-confirmacao">
          Tem certeza que deseja apagar a inadimplência do mês{" "}
          <strong>{formatarMesAno(inadimplenciaParaCancelar.item.vencimento)}</strong> do cliente{" "}
          <strong>{inadimplenciaParaCancelar.nomeCliente}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="modal__botoes">
          <button type="button" className="btn btn--secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button type="button" className="btn btn--danger" onClick={() => void onConfirmar()}>
            Apagar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
