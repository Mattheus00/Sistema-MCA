import AdminItemCard from "@/components/ui/AdminItemCard";
import ResponsiveList from "@/components/ui/ResponsiveList";
import { formatarMoeda } from "@/lib/valorBrasil";
import {
  classeBadgeStatus,
  classeValorMovimentacao,
  formatarDataLivroCaixa,
  formatarValorMovimentacao,
  labelStatusMovimentacao,
  labelTipoMovimentacao,
} from "@/lib/livroCaixaUtils";
import type { RelatorioLivroCaixa } from "@/types/livroCaixa";

type LivroCaixaRelatorioProps = {
  loadingRelatorio: boolean;
  relatorio: RelatorioLivroCaixa | null;
};

export default function LivroCaixaRelatorio({
  loadingRelatorio,
  relatorio,
}: LivroCaixaRelatorioProps) {
  return (
    <div className="livro-caixa__relatorio">
      {loadingRelatorio ? (
        <p className="livro-caixa__vazio">Carregando relatório…</p>
      ) : relatorio ? (
        <>
          <div className="livro-caixa__relatorio-resumo">
            <div>
              <span>Período</span>
              <strong>
                {formatarDataLivroCaixa(relatorio.dataInicio)} —{" "}
                {formatarDataLivroCaixa(relatorio.dataFim)}
              </strong>
            </div>
            <div>
              <span>Saldo inicial</span>
              <strong>{formatarMoeda(relatorio.saldoInicial)}</strong>
            </div>
            <div>
              <span>Entradas</span>
              <strong className="livro-caixa__valor--entrada">
                {formatarMoeda(relatorio.totalEntradas)}
              </strong>
            </div>
            <div>
              <span>Saídas</span>
              <strong className="livro-caixa__valor--saida">
                {formatarMoeda(relatorio.totalSaidas)}
              </strong>
            </div>
            <div>
              <span>Saldo final</span>
              <strong>{formatarMoeda(relatorio.saldoFinal)}</strong>
            </div>
          </div>

          {relatorio.porCategoria && relatorio.porCategoria.length > 0 && (
            <section className="dash-card">
              <h2 className="dash-card__title">Por categoria</h2>
              <ul className="livro-caixa__relatorio-categorias">
                {relatorio.porCategoria.map((c) => (
                  <li key={c.categoriaNome}>
                    <strong>{c.categoriaNome}</strong>
                    <span>Entradas: {formatarMoeda(c.entradas)}</span>
                    <span>Saídas: {formatarMoeda(c.saidas)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

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
                      <th>Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.movimentacoes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="livro-caixa__vazio">
                          Sem movimentações no período.
                        </td>
                      </tr>
                    ) : (
                      relatorio.movimentacoes.map((m) => (
                        <tr key={m.id}>
                          <td>{formatarDataLivroCaixa(m.dataMovimentacao)}</td>
                          <td>{m.descricao}</td>
                          <td>{m.categoriaNome ?? "—"}</td>
                          <td>{labelTipoMovimentacao(m.tipo)}</td>
                          <td className={classeValorMovimentacao(m.tipo)}>
                            {formatarValorMovimentacao(m.tipo, m.valor)}
                          </td>
                          <td>{labelStatusMovimentacao(m.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            }
            mobile={
              relatorio.movimentacoes.length === 0 ? (
                <p className="livro-caixa__vazio">Sem movimentações no período.</p>
              ) : (
                <div className="admin-item-list">
                  {relatorio.movimentacoes.map((m) => (
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
                        {
                          label: "Status",
                          value: (
                            <span className={classeBadgeStatus(m.status)}>
                              {labelStatusMovimentacao(m.status)}
                            </span>
                          ),
                        },
                      ]}
                    />
                  ))}
                </div>
              )
            }
          />
        </>
      ) : (
        <p className="livro-caixa__vazio">Selecione um período válido.</p>
      )}
    </div>
  );
}
