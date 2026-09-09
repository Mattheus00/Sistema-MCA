import type { Dispatch, SetStateAction } from "react";
import type { ModalPagamentoState } from "@/hooks/honorariosClienteTypes";

type ModalPagamentoTotalProps = {
  modalPagamento: ModalPagamentoState;
  salvandoPagamento: boolean;
  setModalPagamento: Dispatch<SetStateAction<ModalPagamentoState | null>>;
};

export default function ModalPagamentoTotal({
  modalPagamento,
  salvandoPagamento,
  setModalPagamento,
}: ModalPagamentoTotalProps) {
  return (
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
                prev ? { ...prev, descontoDigitado: e.target.value } : prev,
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
                prev ? { ...prev, metodoPagamento: e.target.value } : prev,
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
                prev ? { ...prev, dataPagamento: e.target.value } : prev,
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
            setModalPagamento((prev) => (prev ? { ...prev, observacao: e.target.value } : prev))
          }
          className="registro-inadimplencia__textarea"
          rows={2}
          disabled={salvandoPagamento}
        />
      </div>
    </>
  );
}
