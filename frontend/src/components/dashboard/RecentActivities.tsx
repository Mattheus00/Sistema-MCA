import { Link } from "react-router-dom";
import { formatarDataHoraDashboard, formatarMoedaDashboard } from "@/lib/dashboardUtils";
import type { AtividadeDashboard } from "@/lib/dashboardUtils";
import AdminItemCard from "@/components/AdminItemCard";
import ResponsiveList from "@/components/ResponsiveList";

type RecentActivitiesProps = {
  atividades: AtividadeDashboard[];
  loading: boolean;
};

export function RecentActivities({ atividades, loading }: RecentActivitiesProps) {
  return (
    <section className="dash-card dash-card--wide" aria-labelledby="dash-atividades-titulo">
      <div className="dash-card__head dash-card__head--split">
        <h2 id="dash-atividades-titulo" className="dash-card__title">
          Últimas atividades
        </h2>
        <Link to="/inadimplentes" className="dash-card__link dash-card__link--inline">
          Ver todas
        </Link>
      </div>
      {loading ? (
        <div className="dash-card__loading" role="status">
          Carregando atividades…
        </div>
      ) : atividades.length === 0 ? (
        <div className="dash-empty" role="status">
          Nenhuma atividade recente. Cadastre clientes e inadimplências para ver aqui.
        </div>
      ) : (
        <ResponsiveList
          desktop={
            <div className="dash-activities-table-wrap">
              <table className="dash-activities-table">
                <thead>
                  <tr>
                    <th scope="col">Atividade</th>
                    <th scope="col">Data e horário</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="dash-activities-table__valor">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {atividades.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong className="dash-activities-table__titulo">{a.titulo}</strong>
                        <span className="dash-activities-table__desc">{a.descricao}</span>
                      </td>
                      <td>{formatarDataHoraDashboard(a.dataHora)}</td>
                      <td>
                        <span
                          className={`dash-status-badge ${
                            a.status === "Confirmado" ? "dash-status-badge--ok" : "dash-status-badge--warn"
                          }`}
                        >
                          {a.status ?? "—"}
                        </span>
                      </td>
                      <td className="dash-activities-table__valor">
                        {a.valor != null ? formatarMoedaDashboard(a.valor) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
          mobile={
            <ul className="admin-item-list">
              {atividades.map((a) => (
                <li key={a.id}>
                  <AdminItemCard
                    title={a.titulo}
                    meta={a.descricao}
                    value={a.valor != null ? formatarMoedaDashboard(a.valor) : undefined}
                    fields={[
                      { label: "Data", value: formatarDataHoraDashboard(a.dataHora) },
                      {
                        label: "Status",
                        value: (
                          <span
                            className={`dash-status-badge ${
                              a.status === "Confirmado" ? "dash-status-badge--ok" : "dash-status-badge--warn"
                            }`}
                          >
                            {a.status ?? "—"}
                          </span>
                        ),
                      },
                    ]}
                  />
                </li>
              ))}
            </ul>
          }
        />
      )}
    </section>
  );
}
