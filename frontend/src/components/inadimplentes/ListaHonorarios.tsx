import type { Dispatch, SetStateAction } from "react";
import type { NavigateFunction } from "react-router-dom";
import {
  HonorariosCardMobile,
  HonorariosLinhaDesktop,
  type HonorariosItemHandlers,
} from "@/components/inadimplentes/HonorariosItem";
import ResponsiveList from "@/components/ui/ResponsiveList";
import { formatarMoeda } from "@/lib/valorBrasil";
import type { Inadimplencia } from "@/types/api";

type ListaHonorariosProps = {
  loading: boolean;
  itens: Inadimplencia[];
  itensPaginaHonorarios: Inadimplencia[];
  itensPorPagina: number;
  paginaAtualHonorarios: number;
  totalPaginasHonorarios: number;
  totalEmAberto: number;
  qtdEmAberto: number;
  gerandoPdfConsolidado: boolean;
  setPagina: Dispatch<SetStateAction<number>>;
  navigate: NavigateFunction;
  abrirModalPdfConsolidado: () => void;
  handlers: HonorariosItemHandlers;
};

export default function ListaHonorarios({
  loading,
  itens,
  itensPaginaHonorarios,
  itensPorPagina,
  paginaAtualHonorarios,
  totalPaginasHonorarios,
  totalEmAberto,
  qtdEmAberto,
  gerandoPdfConsolidado,
  setPagina,
  navigate,
  abrirModalPdfConsolidado,
  handlers,
}: ListaHonorariosProps) {
  return (
    <section className="page-inadimplentes-honorarios__secao">
      <div className="page-inadimplentes-honorarios__secao-topo">
        <h2 className="page-inadimplentes__tabela-titulo">Detalhamento por período</h2>
        {!loading && qtdEmAberto > 0 && (
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={abrirModalPdfConsolidado}
            disabled={gerandoPdfConsolidado}
            title="Gera um PDF com todos os períodos em aberto (baixar ou enviar por e-mail)"
          >
            {gerandoPdfConsolidado ? "Processando…" : "Gerar PDF (todas em aberto)"}
          </button>
        )}
      </div>

      {loading ? (
        <p className="page-inadimplentes__loading">Carregando honorários...</p>
      ) : itens.length === 0 ? (
        <div className="page-inadimplentes-honorarios__vazio">
          <p>Nenhum honorário em aberto para este cliente.</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate("/inadimplentes")}
          >
            Voltar para a lista
          </button>
        </div>
      ) : (
        <>
          <ResponsiveList
            desktop={
              <div className="page-inadimplentes__tabela-wrap page-inadimplentes-honorarios__tabela-wrap">
                <table className="page-inadimplentes__tabela page-inadimplentes-honorarios__tabela">
                  <thead>
                    <tr>
                      <th>Mês/Ano</th>
                      <th>Descrição</th>
                      <th className="page-inadimplentes__cell-num">Valor</th>
                      <th>Status</th>
                      <th className="page-inadimplentes__th-acao">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensPaginaHonorarios.map((i) => {
                      const key = i.id ?? `${i.vencimento}-${i.valor}`;
                      return <HonorariosLinhaDesktop key={key} item={i} handlers={handlers} />;
                    })}
                  </tbody>
                </table>
              </div>
            }
            mobile={
              <ul className="admin-item-list">
                {itensPaginaHonorarios.map((i) => {
                  const key = i.id ?? `${i.vencimento}-${i.valor}`;
                  return (
                    <li key={key}>
                      <HonorariosCardMobile item={i} handlers={handlers} />
                    </li>
                  );
                })}
              </ul>
            }
          />
          {itens.length > itensPorPagina && (
            <div className="page-inadimplentes__paginacao page-inadimplentes-honorarios__paginacao">
              <button
                type="button"
                className="btn btn--secondary btn--small"
                disabled={paginaAtualHonorarios <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span className="page-inadimplentes__paginacao-info">
                Página {paginaAtualHonorarios} de {totalPaginasHonorarios} ({itens.length} período
                {itens.length !== 1 ? "s" : ""})
              </span>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                disabled={paginaAtualHonorarios >= totalPaginasHonorarios}
                onClick={() => setPagina((p) => Math.min(totalPaginasHonorarios, p + 1))}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {!loading && itens.length > 0 && (
        <p className="page-inadimplentes-honorarios__total-geral">
          Total geral em aberto: <strong>{formatarMoeda(totalEmAberto)}</strong>
        </p>
      )}
    </section>
  );
}
