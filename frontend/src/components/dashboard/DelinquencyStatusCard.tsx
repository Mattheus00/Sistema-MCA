import { Link } from "react-router-dom";
import { formatarMoedaDashboard, formatarPercentualDashboard } from "@/lib/dashboardUtils";
import type { FaixaInadimplenciaUi } from "@/lib/dashboardUtils";

type DelinquencyStatusCardProps = {
  faixas: FaixaInadimplenciaUi[];
  loading: boolean;
};

export function DelinquencyStatusCard({ faixas, loading }: DelinquencyStatusCardProps) {
  return (
    <section className="dash-card" aria-labelledby="dash-situacao-titulo">
      <h2 id="dash-situacao-titulo" className="dash-card__title">
        Situação das inadimplências
      </h2>
      {loading ? (
        <div className="dash-card__loading" role="status">
          Carregando situação…
        </div>
      ) : faixas.length === 0 ? (
        <div className="dash-empty" role="status">
          Nenhuma faixa de atraso disponível no momento.
        </div>
      ) : (
        <ul className="dash-aging">
          {faixas.map((faixa) => (
            <li key={faixa.id} className="dash-aging__item">
              <div className="dash-aging__top">
                <span className={`dash-aging__dot dash-aging__dot--${faixa.cor}`} aria-hidden="true" />
                <span className="dash-aging__rotulo">{faixa.rotulo}</span>
                <span className="dash-aging__valor">{formatarMoedaDashboard(faixa.valor)}</span>
                <span className="dash-aging__pct">{formatarPercentualDashboard(faixa.percentual)}</span>
              </div>
              <div className="dash-aging__bar" role="progressbar" aria-valuenow={faixa.percentual} aria-valuemin={0} aria-valuemax={100}>
                <span
                  className={`dash-aging__fill dash-aging__fill--${faixa.cor}`}
                  style={{ width: `${Math.min(100, Math.max(0, faixa.percentual))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link to="/relatorios" className="dash-card__link">
        Ver detalhes
      </Link>
    </section>
  );
}
