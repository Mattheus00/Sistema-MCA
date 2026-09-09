import { CancelIcon, CheckIcon, EmailSendIcon } from "@/components/inadimplentes/HonorariosIcons";
import AdminItemCard from "@/components/ui/AdminItemCard";
import { STATUS_DIVIDA_FRONT } from "@/lib/constants/status";
import {
  formatarMesAno,
  isInadimplenciaEmAberto,
  statusPagamentoHonorario,
  valoresHonorario,
} from "@/lib/inadimplentesUtils";
import { formatarMoeda } from "@/lib/valorBrasil";
import type { Inadimplencia } from "@/types/api";

export type HonorariosItemHandlers = {
  abrirModalPagamento: (i: Inadimplencia, tipo?: "total" | "parcial") => void;
  onCobrar: (i: Inadimplencia) => void;
  onCancelar: (i: Inadimplencia) => void;
};

function statusClassHonorario(status: ReturnType<typeof statusPagamentoHonorario>): string {
  return status === STATUS_DIVIDA_FRONT.PAGO
    ? "page-inadimplentes-honorarios__status--pago"
    : status === "Parcial"
      ? "page-inadimplentes-honorarios__status--parcial"
      : "page-inadimplentes-honorarios__status--aberto";
}

export function HonorariosLinhaDesktop({
  item,
  handlers,
}: {
  item: Inadimplencia;
  handlers: HonorariosItemHandlers;
}) {
  const { valorTotal } = valoresHonorario(item);
  const status = statusPagamentoHonorario(item);
  const statusClass = statusClassHonorario(status);

  return (
    <tr className="page-inadimplentes-honorarios__linha">
      <td>{formatarMesAno(item.vencimento)}</td>
      <td
        className="page-inadimplentes-honorarios__descricao"
        title={item.descricao?.trim() || undefined}
      >
        {item.descricao?.trim() || "—"}
      </td>
      <td className="page-inadimplentes__cell-num">{formatarMoeda(valorTotal)}</td>
      <td>
        <span className={`page-inadimplentes-honorarios__status ${statusClass}`}>{status}</span>
      </td>
      <td>
        {isInadimplenciaEmAberto(item) ? (
          <div className="page-inadimplentes__acoes-detalhe page-inadimplentes-honorarios__acoes-linha">
            <button
              type="button"
              className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--confirmar"
              onClick={() => item.id != null && handlers.abrirModalPagamento(item)}
              disabled={item.id == null || valorTotal <= 0}
              title="Registrar pagamento"
              aria-label="Registrar pagamento"
            >
              <CheckIcon />
            </button>
            <button
              type="button"
              className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--email"
              onClick={() => handlers.onCobrar(item)}
              title="Enviar cobrança"
              aria-label="Enviar cobrança"
            >
              <EmailSendIcon />
            </button>
            <button
              type="button"
              className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--cancelar"
              onClick={() => handlers.onCancelar(item)}
              disabled={item.id == null}
              title="Cancelar inadimplência"
              aria-label="Cancelar inadimplência"
            >
              <CancelIcon />
            </button>
          </div>
        ) : (
          <span className="page-inadimplentes-honorarios__sem-acao">—</span>
        )}
      </td>
    </tr>
  );
}

export function HonorariosCardMobile({
  item,
  handlers,
}: {
  item: Inadimplencia;
  handlers: HonorariosItemHandlers;
}) {
  const { valorTotal } = valoresHonorario(item);
  const status = statusPagamentoHonorario(item);
  const statusClass = statusClassHonorario(status);

  return (
    <AdminItemCard
      title={formatarMesAno(item.vencimento)}
      meta={item.descricao?.trim() || undefined}
      value={formatarMoeda(valorTotal)}
      fields={[
        {
          label: "Status",
          value: (
            <span className={`page-inadimplentes-honorarios__status ${statusClass}`}>{status}</span>
          ),
        },
      ]}
      actions={
        isInadimplenciaEmAberto(item) ? (
          <>
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => item.id != null && handlers.abrirModalPagamento(item)}
              disabled={item.id == null || valorTotal <= 0}
            >
              Pagamento
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => handlers.onCobrar(item)}
            >
              Cobrança
            </button>
            <button
              type="button"
              className="btn btn--danger btn--small"
              onClick={() => handlers.onCancelar(item)}
              disabled={item.id == null}
            >
              Cancelar
            </button>
          </>
        ) : undefined
      }
    />
  );
}
