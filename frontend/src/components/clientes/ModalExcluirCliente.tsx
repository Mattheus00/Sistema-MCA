import type { Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import type { Cliente } from "@/types/api";

type ModalExcluirClienteProps = {
  clienteParaExcluir: Cliente;
  setClienteParaExcluir: Dispatch<SetStateAction<Cliente | null>>;
  excluir: (c: Cliente) => void;
};

export default function ModalExcluirCliente({
  clienteParaExcluir,
  setClienteParaExcluir,
  excluir,
}: ModalExcluirClienteProps) {
  useBodyScrollLock(true);

  return createPortal(
    <ModalOverlay onDismiss={() => setClienteParaExcluir(null)}>
      <div className="modal modal--confirmar-exclusao">
        <h2 className="modal__titulo">Excluir cliente?</h2>
        <p className="modal__texto-confirmacao">
          Tem certeza que deseja excluir o cliente{" "}
          <strong>
            {clienteParaExcluir.codigo ? `${clienteParaExcluir.codigo} — ` : ""}
            {clienteParaExcluir.nome}
          </strong>
          ? Esta ação não pode ser desfeita.
        </p>
        <div className="modal__botoes">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setClienteParaExcluir(null)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => excluir(clienteParaExcluir)}
          >
            Excluir
          </button>
        </div>
      </div>
    </ModalOverlay>,
    document.body,
  );
}
