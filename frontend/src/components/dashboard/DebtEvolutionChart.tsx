import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarMoedaDashboard } from "@/lib/dashboardUtils";
import type { PontoEvolucao } from "@/lib/dashboardUtils";
import type { PeriodoEvolucao } from "@/hooks/useDashboardData";

const OPCOES: { valor: PeriodoEvolucao; rotulo: string }[] = [
  { valor: 6, rotulo: "Últimos 6 meses" },
  { valor: 12, rotulo: "Últimos 12 meses" },
  { valor: "total", rotulo: "Total" },
];

type DebtEvolutionChartProps = {
  dados: PontoEvolucao[];
  periodo: PeriodoEvolucao;
  onPeriodoChange: (p: PeriodoEvolucao) => void;
  loading: boolean;
  semDados: boolean;
};

export function DebtEvolutionChart({
  dados,
  periodo,
  onPeriodoChange,
  loading,
  semDados,
}: DebtEvolutionChartProps) {
  const temValor = dados.some((d) => d.valor > 0);

  return (
    <section className="dash-card dash-card--chart" aria-labelledby="dash-evolucao-titulo">
      <div className="dash-card__head">
        <div>
          <h2 id="dash-evolucao-titulo" className="dash-card__title">
            Evolução do valor em aberto
          </h2>
          <p className="dash-card__subtitle">
            Acúmulo do valor em aberto conforme novas dívidas entram na carteira
          </p>
        </div>
        <div className="dash-pill-group" role="group" aria-label="Período da evolução">
          {OPCOES.map(({ valor, rotulo }) => (
            <button
              key={String(valor)}
              type="button"
              className={`dash-pill ${periodo === valor ? "dash-pill--active" : ""}`}
              onClick={() => onPeriodoChange(valor)}
              aria-pressed={periodo === valor}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="dash-card__loading" role="status">
          Carregando gráfico…
        </div>
      ) : !temValor || semDados ? (
        <div className="dash-empty dash-empty--chart" role="status">
          Sem dados históricos suficientes para exibir a evolução neste período.
        </div>
      ) : (
        <div className="dash-line-chart" aria-label="Gráfico de evolução do valor em aberto">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dash-evolucao-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A43F9B" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#A43F9B" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mesLabel" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={(v) =>
                  Number(v).toLocaleString("pt-BR", { notation: "compact", compactDisplay: "short" })
                }
              />
              <Tooltip
                formatter={(value: number) => [formatarMoedaDashboard(value), "Total acumulado"]}
                labelFormatter={(label) => `Até ${label}`}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke="#A43F9B"
                strokeWidth={2.5}
                fill="url(#dash-evolucao-fill)"
                dot={{ r: 4, fill: "#A43F9B", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <Link to="/relatorios" className="dash-card__link">
        Ver relatório completo
      </Link>
    </section>
  );
}
