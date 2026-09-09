import { useCallback, useEffect, useRef, useState } from "react";
import { listarPagamentosDivida, listarPagamentosPorQuery } from "@/lib/inadimplentesApi";
import { formatarData, formatarMoeda, ordenarPagamentosPorData } from "@/lib/inadimplentesUtils";
import { formatarDataHora } from "@/lib/valorBrasil";
import {
  STATUS_COBRANCA_SICOOB,
  METODO_PAGAMENTO,
  statusEh,
  statusNormalizado,
} from "@/lib/constants/status";
import { listarCobrancasPorDivida } from "@/lib/sicoobApi";
import type { CobrancaSicoob, PagamentoInadimplencia } from "@/types/api";

const POLL_MS = 15_000;

type Props = {
  dividaId: string;
  sicoobMock?: boolean;
  onPagamentoConfirmado: () => void;
};

function badgeCobranca(c: CobrancaSicoob) {
  if (statusEh(c.status, STATUS_COBRANCA_SICOOB.PENDENTE)) {
    return (
      <span className="honorarios-sicoob__badge honorarios-sicoob__badge--pendente">
        Aguardando pagamento
      </span>
    );
  }
  if (statusEh(c.status, STATUS_COBRANCA_SICOOB.PAGO)) {
    return (
      <span className="honorarios-sicoob__badge honorarios-sicoob__badge--pago">
        Pagamento confirmado
        {c.pagoEm ? ` · ${formatarDataHora(c.pagoEm, { fallbackData: true })}` : ""}
      </span>
    );
  }
  if (statusEh(c.status, STATUS_COBRANCA_SICOOB.ERRO)) {
    return (
      <span
        className="honorarios-sicoob__badge honorarios-sicoob__badge--erro"
        title={c.mensagemErro ?? undefined}
      >
        Erro{c.mensagemErro ? `: ${c.mensagemErro}` : ""}
      </span>
    );
  }
  if (statusEh(c.status, STATUS_COBRANCA_SICOOB.CANCELADO)) {
    return (
      <span className="honorarios-sicoob__badge honorarios-sicoob__badge--cancelado">
        Cancelado
      </span>
    );
  }
  return <span className="honorarios-sicoob__badge">{c.status}</span>;
}

export default function HonorariosSicoobDetalhe({
  dividaId,
  sicoobMock,
  onPagamentoConfirmado,
}: Props) {
  const [cobrancas, setCobrancas] = useState<CobrancaSicoob[]>([]);
  const [pagamentos, setPagamentos] = useState<PagamentoInadimplencia[]>([]);
  const [loading, setLoading] = useState(true);
  const statusAnteriorRef = useRef<Record<string, string>>({});
  const notificouPagoRef = useRef<Set<string>>(new Set());
  const onConfirmadoRef = useRef(onPagamentoConfirmado);
  onConfirmadoRef.current = onPagamentoConfirmado;

  const carregarPagamentos = useCallback(async () => {
    try {
      return await listarPagamentosDivida(dividaId);
    } catch {
      try {
        return await listarPagamentosPorQuery(dividaId);
      } catch {
        return [];
      }
    }
  }, [dividaId]);

  const carregar = useCallback(
    async (silent = false) => {
      if (!dividaId) return;
      if (!silent) setLoading(true);
      try {
        const [cobs, pags] = await Promise.all([
          listarCobrancasPorDivida(dividaId),
          carregarPagamentos(),
        ]);

        for (const c of cobs) {
          const id = c.cobrancaId;
          const atual = statusNormalizado(c.status);
          const anterior = statusAnteriorRef.current[id];
          if (
            statusEh(anterior, STATUS_COBRANCA_SICOOB.PENDENTE) &&
            statusEh(atual, STATUS_COBRANCA_SICOOB.PAGO) &&
            !notificouPagoRef.current.has(id)
          ) {
            notificouPagoRef.current.add(id);
            onConfirmadoRef.current();
          }
          statusAnteriorRef.current[id] = atual;
        }

        setCobrancas(cobs);
        setPagamentos(ordenarPagamentosPorData(pags));
      } catch {
        // silencioso no polling — evita spam de erro a cada 15s
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [dividaId, carregarPagamentos],
  );

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const temPendente = cobrancas.some((c) => statusEh(c.status, STATUS_COBRANCA_SICOOB.PENDENTE));

  useEffect(() => {
    if (!temPendente) return;
    const t = setInterval(() => void carregar(true), POLL_MS);
    return () => clearInterval(t);
  }, [temPendente, carregar]);

  const listaPagamentos = pagamentos;

  return (
    <div className="honorarios-sicoob">
      {sicoobMock && (
        <p className="honorarios-sicoob__mock-banner">
          Modo simulação Sicoob — confirmação automática pode não refletir produção.
        </p>
      )}

      <div className="honorarios-sicoob__secao">
        <h4 className="honorarios-sicoob__titulo">Cobrança Sicoob</h4>
        {loading && cobrancas.length === 0 ? (
          <p className="honorarios-sicoob__vazio">Carregando cobranças…</p>
        ) : cobrancas.length === 0 ? (
          <p className="honorarios-sicoob__vazio">Nenhuma cobrança Sicoob emitida.</p>
        ) : (
          <ul className="honorarios-sicoob__lista-cobrancas">
            {cobrancas.map((c) => (
              <li key={c.cobrancaId} className="honorarios-sicoob__item-cobranca">
                <span className="honorarios-sicoob__tipo">{c.tipo}</span>
                {badgeCobranca(c)}
                {temPendente && statusEh(c.status, STATUS_COBRANCA_SICOOB.PENDENTE) && (
                  <span className="honorarios-sicoob__polling" aria-live="polite">
                    Verificando pagamento…
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="honorarios-sicoob__secao">
        <h4 className="honorarios-sicoob__titulo">Pagamentos registrados</h4>
        {loading && listaPagamentos.length === 0 ? (
          <p className="honorarios-sicoob__vazio">Carregando pagamentos…</p>
        ) : listaPagamentos.length === 0 ? (
          <p className="honorarios-sicoob__vazio">Nenhum pagamento registrado.</p>
        ) : (
          <table className="page-inadimplentes__tabela page-inadimplentes__tabela--detalhe honorarios-sicoob__tabela-pagamentos">
            <thead>
              <tr>
                <th>Data</th>
                <th className="page-inadimplentes__cell-num">Valor</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {listaPagamentos.map((p) => {
                const pixSicoob = statusEh(p.metodoPagamento, METODO_PAGAMENTO.PIX_SICOOB);
                return (
                  <tr key={p.pagamentoId ?? `${p.dataPagamento}-${p.valorPago}`}>
                    <td>{formatarData(p.dataPagamento)}</td>
                    <td className="page-inadimplentes__cell-num">{formatarMoeda(p.valorPago)}</td>
                    <td>
                      {pixSicoob ? (
                        <div className="honorarios-sicoob__pagamento-auto">
                          <span className="honorarios-sicoob__badge honorarios-sicoob__badge--pago honorarios-sicoob__badge--inline">
                            Confirmado automaticamente (Sicoob)
                          </span>
                          {p.comprovante && (
                            <span className="honorarios-sicoob__comprovante" title={p.comprovante}>
                              {p.comprovante}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="honorarios-sicoob__metodo">
                          {p.metodoPagamento ?? "Manual"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
