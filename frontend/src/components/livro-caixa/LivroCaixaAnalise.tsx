import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarMoeda } from "@/lib/valorBrasil";
import { formatarMesLabel } from "@/lib/livroCaixaUtils";
import type { AnaliseLivroCaixa } from "@/types/livroCaixa";

const CORES_PIZZA = [
  "#A43F9B",
  "#7c3aed",
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#eab308",
  "#f97316",
];

type LivroCaixaAnaliseProps = {
  loadingAnalise: boolean;
  analise: AnaliseLivroCaixa | null;
};

export default function LivroCaixaAnalise({ loadingAnalise, analise }: LivroCaixaAnaliseProps) {
  const dadosBarra =
    analise?.entradasSaidasMensal.map((s) => ({
      mes: formatarMesLabel(s.mes),
      Entradas: s.entradas,
      Saídas: s.saidas,
    })) ?? [];

  const dadosPizza =
    analise?.despesasPorCategoria
      .filter((d) => d.valor > 0)
      .map((d) => ({
        name: d.categoriaNome,
        value: d.valor,
      })) ?? [];

  return (
    <div className="livro-caixa__analise">
      {loadingAnalise ? (
        <p className="livro-caixa__vazio">Carregando análise…</p>
      ) : (
        <>
          <section className="dash-card dash-card--chart">
            <h2 className="dash-card__title">Entradas x saídas mensal</h2>
            <div className="livro-caixa__chart-bar">
              {dadosBarra.length === 0 ? (
                <p className="livro-caixa__vazio">Sem movimentações realizadas no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dadosBarra}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickFormatter={(v) =>
                        Number(v).toLocaleString("pt-BR", { notation: "compact" })
                      }
                    />
                    <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                    <Legend />
                    <Bar dataKey="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Saídas" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <div className="livro-caixa__analise-grid">
            <section className="dash-card dash-card--chart">
              <h2 className="dash-card__title">Despesas por categoria</h2>
              {dadosPizza.length === 0 ? (
                <p className="livro-caixa__vazio">Sem despesas no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dadosPizza}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {dadosPizza.map((_, i) => (
                        <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatarMoeda(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </section>

            <section className="dash-card livro-caixa__fluxo">
              <h2 className="dash-card__title">Fluxo de caixa</h2>
              {analise && (
                <dl className="livro-caixa__fluxo-lista">
                  <div>
                    <dt>Saldo inicial</dt>
                    <dd>{formatarMoeda(analise.fluxoCaixa.saldoInicial)}</dd>
                  </div>
                  <div className="livro-caixa__fluxo-entrada">
                    <dt>+ Entradas</dt>
                    <dd>{formatarMoeda(analise.fluxoCaixa.totalEntradas)}</dd>
                  </div>
                  <div className="livro-caixa__fluxo-saida">
                    <dt>− Saídas</dt>
                    <dd>{formatarMoeda(analise.fluxoCaixa.totalSaidas)}</dd>
                  </div>
                  <div className="livro-caixa__fluxo-final">
                    <dt>Saldo final</dt>
                    <dd>{formatarMoeda(analise.fluxoCaixa.saldoFinal)}</dd>
                  </div>
                </dl>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
