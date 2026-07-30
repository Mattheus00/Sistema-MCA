import { Link } from "react-router-dom";
import { DonutChart } from "@/components/DonutChart";
import type { PeriodoChart } from "@/hooks/useDashboardData";

const OPCOES: { valor: PeriodoChart; rotulo: string }[] = [
  { valor: 30, rotulo: "30 dias" },
  { valor: 60, rotulo: "60 dias" },
  { valor: 90, rotulo: "90 dias" },
  { valor: "total", rotulo: "Total" },
];

type ReceivablesChartProps = {
  periodo: PeriodoChart;
  onPeriodoChange: (p: PeriodoChart) => void;
  aReceber: number;
  recebido: number;
  baixadoCancelado: number;
  loading: boolean;
};

export function ReceivablesChart({
  periodo,
  onPeriodoChange,
  aReceber,
  recebido,
  baixadoCancelado,
  loading,
}: ReceivablesChartProps) {
  return (
    <section className="dash-card dash-card--chart" aria-labelledby="dash-montante-titulo">
      <div className="dash-card__head">
        <h2 id="dash-montante-titulo" className="dash-card__title">
          Montante a receber
        </h2>
        <div className="dash-pill-group" role="group" aria-label="Período do montante">
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
      ) : (
        <DonutChart
          totalEmAberto={aReceber}
          totalPago={recebido}
          totalBaixadoCancelado={baixadoCancelado}
          centerLabel="Total a receber"
        />
      )}
      <Link to="/relatorios" className="dash-card__link">
        Ver detalhes do montante
      </Link>
    </section>
  );
}
