import type { Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "@/components/inadimplentes/HonorariosIcons";
import ModalPagamentoParcial from "@/components/inadimplentes/ModalPagamentoParcial";
import ModalPagamentoResumo from "@/components/inadimplentes/ModalPagamentoResumo";
import ModalPagamentoTotal from "@/components/inadimplentes/ModalPagamentoTotal";
import { descontoNormalizado, type ModalPagamentoState } from "@/hooks/honorariosClienteTypes";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { saldoDevedorItem } from "@/lib/inadimplentesUtils";
import { parseValorReais } from "@/lib/valorBrasil";

type ModalPagamentoProps = {
  modalPagamento: ModalPagamentoState;
  salvandoPagamento: boolean;
  setModalPagamento: Dispatch<SetStateAction<ModalPagamentoState | null>>;
  salvarPagamentoModal: () => void;
};

export default function ModalPagamento({
  modalPagamento,
  salvandoPagamento,
  setModalPagamento,
  salvarPagamentoModal,
}: ModalPagamentoProps) {
  useBodyScrollLock(true);

  const i = modalPagamento.inadimplencia;
  const saldo = saldoDevedorItem(i);
  const desconto = descontoNormalizado(modalPagamento.descontoDigitado, saldo);
  const valorParcial = parseValorReais(modalPagamento.valorParcialDigitado);
  const totalReceber =
    modalPagamento.tipo === "total" ? Math.max(0, saldo - desconto) : Math.max(0, valorParcial);
  const saldoRestante =
    modalPagamento.tipo === "parcial" && valorParcial > 0
      ? Math.max(0, saldo - valorParcial)
      : null;

  return createPortal(
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

              <div
                className="modal-pagamento__tipo-tabs"
                role="tablist"
                aria-label="Tipo de pagamento"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={modalPagamento.tipo === "total"}
                  className={`modal-pagamento__tipo-tab${modalPagamento.tipo === "total" ? " modal-pagamento__tipo-tab--ativo" : ""}`}
                  onClick={() =>
                    setModalPagamento((prev) =>
                      prev
                        ? {
                            ...prev,
                            tipo: "total",
                            metodoPagamento: prev.metodoPagamento || "",
                          }
                        : prev,
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
                      prev
                        ? {
                            ...prev,
                            tipo: "parcial",
                            metodoPagamento: prev.metodoPagamento || "PIX",
                          }
                        : prev,
                    )
                  }
                  disabled={salvandoPagamento}
                >
                  <span className="modal-pagamento__tipo-icone modal-pagamento__tipo-icone--parcial">
                    R$
                  </span>
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
                  <ModalPagamentoTotal
                    modalPagamento={modalPagamento}
                    salvandoPagamento={salvandoPagamento}
                    setModalPagamento={setModalPagamento}
                  />
                ) : (
                  <ModalPagamentoParcial
                    modalPagamento={modalPagamento}
                    salvandoPagamento={salvandoPagamento}
                    setModalPagamento={setModalPagamento}
                  />
                )}
              </div>
            </section>
          </div>

          <ModalPagamentoResumo
            modalPagamento={modalPagamento}
            saldo={saldo}
            desconto={desconto}
            valorParcial={valorParcial}
            totalReceber={totalReceber}
            saldoRestante={saldoRestante}
            salvandoPagamento={salvandoPagamento}
            onSalvar={salvarPagamentoModal}
            onCancelar={() => setModalPagamento(null)}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
