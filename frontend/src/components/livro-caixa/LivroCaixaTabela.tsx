import type { Dispatch, SetStateAction } from "react";
import AdminItemCard from "@/components/ui/AdminItemCard";
import ResponsiveList from "@/components/ui/ResponsiveList";
import {
  classeBadgeStatus,
  classeValorMovimentacao,
  formatarDataLivroCaixa,
  formatarValorMovimentacao,
  labelFormaPagamento,
  labelStatusMovimentacao,
  labelTipoMovimentacao,
} from "@/lib/livroCaixaUtils";
import type { MovimentacaoResumo } from "@/types/livroCaixa";

type LivroCaixaTabelaProps = {
  loadingLista: boolean;
  movimentacoes: MovimentacaoResumo[];
  abrirDetalhe: (id: string) => void;
  totalElementos: number;
  pagina: number;
  totalPaginas: number;
  setPagina: Dispatch<SetStateAction<number>>;
};

export default function LivroCaixaTabela({
  loadingLista,
  movimentacoes,
  abrirDetalhe,
  totalElementos,
  pagina,
  totalPaginas,
  setPagina,
}: LivroCaixaTabelaProps) {
  function renderLinhaAcoes(m: MovimentacaoResumo) {
    return (
      <button type="button" className="btn btn--link" onClick={() => void abrirDetalhe(m.id)}>
        Ver
      </button>
    );
  }

  return (
    <>
      <ResponsiveList
        desktop={
          <div className="livro-caixa__tabela-wrap">
            <table className="livro-caixa__tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Tipo</th>
                  <th>Forma</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingLista ? (
                  <tr>
                    <td colSpan={8} className="livro-caixa__vazio">
                      Carregando…
                    </td>
                  </tr>
                ) : movimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="livro-caixa__vazio">
                      Nenhuma movimentação encontrada.
                    </td>
                  </tr>
                ) : (
                  movimentacoes.map((m) => (
                    <tr
                      key={m.id}
                      className={
                        m.vencido
                          ? "livro-caixa__linha--vencida"
                          : m.proximoVencimento
                            ? "livro-caixa__linha--proxima"
                            : ""
                      }
                    >
                      <td>{formatarDataLivroCaixa(m.dataMovimentacao)}</td>
                      <td>
                        <strong>{m.descricao}</strong>
                        {m.vencido && <span className="livro-caixa__flag">Vencido</span>}
                        {m.proximoVencimento && !m.vencido && (
                          <span className="livro-caixa__flag livro-caixa__flag--proximo">
                            Próximo
                          </span>
                        )}
                      </td>
                      <td>{m.categoriaNome ?? "—"}</td>
                      <td>{labelTipoMovimentacao(m.tipo)}</td>
                      <td>{labelFormaPagamento(m.formaPagamento)}</td>
                      <td className={classeValorMovimentacao(m.tipo)}>
                        {formatarValorMovimentacao(m.tipo, m.valor)}
                      </td>
                      <td>
                        <span className={classeBadgeStatus(m.status)}>
                          {labelStatusMovimentacao(m.status)}
                        </span>
                      </td>
                      <td>{renderLinhaAcoes(m)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        }
        mobile={
          loadingLista ? (
            <p className="livro-caixa__vazio">Carregando…</p>
          ) : movimentacoes.length === 0 ? (
            <p className="livro-caixa__vazio">Nenhuma movimentação encontrada.</p>
          ) : (
            movimentacoes.map((m) => (
              <AdminItemCard
                key={m.id}
                title={m.descricao}
                meta={`${formatarDataLivroCaixa(m.dataMovimentacao)} · ${labelTipoMovimentacao(m.tipo)}`}
                value={
                  <span className={classeValorMovimentacao(m.tipo)}>
                    {formatarValorMovimentacao(m.tipo, m.valor)}
                  </span>
                }
                fields={[
                  { label: "Categoria", value: m.categoriaNome ?? "—" },
                  { label: "Forma", value: labelFormaPagamento(m.formaPagamento) },
                  {
                    label: "Status",
                    value: (
                      <span className={classeBadgeStatus(m.status)}>
                        {labelStatusMovimentacao(m.status)}
                      </span>
                    ),
                  },
                ]}
                actions={renderLinhaAcoes(m)}
                onClick={() => void abrirDetalhe(m.id)}
                className={m.vencido ? "livro-caixa__card--vencida" : ""}
              />
            ))
          )
        }
      />

      <div className="livro-caixa__paginacao">
        <span>{totalElementos} registro(s)</span>
        <div>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={pagina <= 0 || loadingLista}
            onClick={() => setPagina((p) => p - 1)}
          >
            Anterior
          </button>
          <span>
            Página {pagina + 1} de {totalPaginas}
          </span>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={pagina + 1 >= totalPaginas || loadingLista}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </>
  );
}
