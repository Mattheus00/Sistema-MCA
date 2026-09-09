import { formatarData, formatarMesAno, valoresHonorario } from "@/lib/inadimplentesUtils";
import { formatarMoeda } from "@/lib/valorBrasil";
import type { ModalPagamentoState } from "@/hooks/honorariosClienteTypes";

type ModalPagamentoResumoProps = {
  modalPagamento: ModalPagamentoState;
  saldo: number;
  desconto: number;
  valorParcial: number;
  totalReceber: number;
  saldoRestante: number | null;
  salvandoPagamento: boolean;
  onSalvar: () => void;
  onCancelar: () => void;
};

export default function ModalPagamentoResumo({
  modalPagamento,
  saldo,
  desconto,
  valorParcial,
  totalReceber,
  saldoRestante,
  salvandoPagamento,
  onSalvar,
  onCancelar,
}: ModalPagamentoResumoProps) {
  const i = modalPagamento.inadimplencia;
  const { valorOriginal, juros } = valoresHonorario(i);
  const descricaoPeriodo = (i.descricao || "").trim();

  return (
    <aside className="modal-pagamento-registro__sidebar">
      <div className="registro-inadimplencia__resumo">
        <h3 className="registro-inadimplencia__resumo-titulo">Resumo do pagamento</h3>
        <dl className="registro-inadimplencia__resumo-lista">
          <div className="registro-inadimplencia__resumo-item">
            <dt>Cliente</dt>
            <dd>{modalPagamento.nomeCliente}</dd>
          </div>
          <div className="registro-inadimplencia__resumo-item">
            <dt>Período</dt>
            <dd>{formatarMesAno(i.vencimento)}</dd>
          </div>
          <div className="registro-inadimplencia__resumo-item">
            <dt>Vencimento</dt>
            <dd>{formatarData(i.vencimento)}</dd>
          </div>
          {descricaoPeriodo ? (
            <div className="registro-inadimplencia__resumo-item">
              <dt>Descrição</dt>
              <dd>{descricaoPeriodo}</dd>
            </div>
          ) : null}
          <div className="registro-inadimplencia__resumo-item">
            <dt>Valor original</dt>
            <dd>{formatarMoeda(valorOriginal)}</dd>
          </div>
          <div className="registro-inadimplencia__resumo-item">
            <dt>Juros</dt>
            <dd>{formatarMoeda(juros)}</dd>
          </div>
          <div className="registro-inadimplencia__resumo-item">
            <dt>Saldo devedor</dt>
            <dd>{formatarMoeda(saldo)}</dd>
          </div>
          {modalPagamento.tipo === "total" && desconto > 0 ? (
            <div className="registro-inadimplencia__resumo-item">
              <dt>Desconto</dt>
              <dd>−{formatarMoeda(desconto)}</dd>
            </div>
          ) : null}
          {saldoRestante != null ? (
            <div className="registro-inadimplencia__resumo-item">
              <dt>Saldo restante</dt>
              <dd>{formatarMoeda(saldoRestante)}</dd>
            </div>
          ) : null}
          <div className="registro-inadimplencia__resumo-item registro-inadimplencia__resumo-item--total">
            <dt>{modalPagamento.tipo === "total" ? "Total a receber" : "Valor deste pagamento"}</dt>
            <dd>{formatarMoeda(totalReceber)}</dd>
          </div>
        </dl>

        <div className="registro-inadimplencia__acoes">
          <button
            type="button"
            className="btn btn--primary registro-inadimplencia__btn-salvar"
            onClick={() => void onSalvar()}
            disabled={
              salvandoPagamento ||
              (modalPagamento.tipo === "total" && !modalPagamento.metodoPagamento.trim()) ||
              (modalPagamento.tipo === "parcial" && valorParcial <= 0)
            }
          >
            {salvandoPagamento
              ? "Salvando..."
              : modalPagamento.tipo === "total"
                ? "Confirmar pagamento total"
                : "Registrar pagamento parcial"}
          </button>
          <button
            type="button"
            className="btn btn--secondary registro-inadimplencia__btn-cancelar"
            onClick={onCancelar}
            disabled={salvandoPagamento}
          >
            Cancelar
          </button>
        </div>
      </div>
    </aside>
  );
}
