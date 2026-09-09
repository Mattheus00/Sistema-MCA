import type { Dispatch, SetStateAction } from "react";
import type { ModalPagamentoState } from "@/hooks/honorariosClienteTypes";

type ModalPagamentoParcialProps = {
  modalPagamento: ModalPagamentoState;
  salvandoPagamento: boolean;
  setModalPagamento: Dispatch<SetStateAction<ModalPagamentoState | null>>;
};

export default function ModalPagamentoParcial({
  modalPagamento,
  salvandoPagamento,
  setModalPagamento,
}: ModalPagamentoParcialProps) {
  return (
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
              prev ? { ...prev, valorParcialDigitado: e.target.value } : prev,
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
                prev ? { ...prev, dataPagamento: e.target.value } : prev,
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
                prev ? { ...prev, metodoPagamento: e.target.value } : prev,
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
  );
}
