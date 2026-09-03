import AdminItemCard from "@/components/AdminItemCard";
import ResponsiveList from "@/components/ResponsiveList";
import {
  classePrioridadeTarefa,
  classeStatusTarefa,
  formatarDataTarefa,
  labelPrioridadeTarefa,
  labelStatusTarefa,
  progressoChecklist,
} from "@/lib/tarefasUtils";
import type { TarefaResumo } from "@/types/tarefas";

type TarefasListaProps = {
  tarefas: TarefaResumo[];
  loading: boolean;
  pagina: number;
  totalPaginas: number;
  totalElementos: number;
  onPaginaChange: (p: number) => void;
  onAbrir: (id: string) => void;
  onEditar: (id: string) => void;
};

export default function TarefasLista({
  tarefas,
  loading,
  pagina,
  totalPaginas,
  totalElementos,
  onPaginaChange,
  onAbrir,
  onEditar,
}: TarefasListaProps) {
  return (
    <div className="tarefas-lista">
      <ResponsiveList
        desktop={
          <div className="tarefas-lista__tabela-wrap">
            <table className="tarefas-lista__tabela">
              <thead>
                <tr>
                  <th>Tarefa</th>
                  <th>Responsável</th>
                  <th>Cliente</th>
                  <th>Prioridade</th>
                  <th>Status</th>
                  <th>Prazo</th>
                  <th>Progresso</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="tarefas__vazio">
                      Carregando…
                    </td>
                  </tr>
                ) : tarefas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="tarefas__vazio">
                      Nenhuma tarefa encontrada.
                    </td>
                  </tr>
                ) : (
                  tarefas.map((t) => {
                    const progresso = progressoChecklist(t.checklistConcluidos, t.checklistTotal);
                    return (
                      <tr key={t.id} className={t.atrasada ? "tarefas-lista__linha--atrasada" : ""}>
                        <td>
                          <button type="button" className="tarefas-lista__link" onClick={() => onAbrir(t.id)}>
                            <strong>{t.titulo}</strong>
                          </button>
                          {t.atrasada && <span className="tarefas-card__atrasada">Atrasada</span>}
                        </td>
                        <td>{t.responsavelNome ?? "—"}</td>
                        <td>{t.categoria ?? "—"}</td>
                        <td>
                          <span className={classePrioridadeTarefa(t.prioridade)}>{labelPrioridadeTarefa(t.prioridade)}</span>
                        </td>
                        <td>
                          <span className={classeStatusTarefa(t.status)}>{labelStatusTarefa(t.status)}</span>
                        </td>
                        <td>{formatarDataTarefa(t.dataVencimento)}</td>
                        <td>
                          {t.checklistTotal > 0 ? (
                            <span>
                              {t.checklistConcluidos}/{t.checklistTotal} ({progresso}%)
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <div className="tarefas-lista__acoes">
                            <button type="button" className="btn btn--link" onClick={() => onAbrir(t.id)}>
                              Ver
                            </button>
                            <button type="button" className="btn btn--link" onClick={() => onEditar(t.id)}>
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        }
        mobile={
          loading ? (
            <p className="tarefas__vazio">Carregando…</p>
          ) : tarefas.length === 0 ? (
            <p className="tarefas__vazio">Nenhuma tarefa encontrada.</p>
          ) : (
            tarefas.map((t) => (
              <AdminItemCard
                key={t.id}
                title={t.titulo}
                meta={t.responsavelNome}
                value={<span className={classePrioridadeTarefa(t.prioridade)}>{labelPrioridadeTarefa(t.prioridade)}</span>}
                fields={[
                  { label: "Status", value: <span className={classeStatusTarefa(t.status)}>{labelStatusTarefa(t.status)}</span> },
                  { label: "Cliente", value: t.categoria ?? "—" },
                  { label: "Prazo", value: formatarDataTarefa(t.dataVencimento) },
                  {
                    label: "Progresso",
                    value: t.checklistTotal > 0 ? `${t.checklistConcluidos}/${t.checklistTotal}` : "—",
                  },
                ]}
                actions={
                  <>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => onAbrir(t.id)}>
                      Ver
                    </button>
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => onEditar(t.id)}>
                      Editar
                    </button>
                  </>
                }
                className={t.atrasada ? "tarefas-card--atrasada" : ""}
              />
            ))
          )
        }
      />

      <div className="tarefas__paginacao">
        <span>{totalElementos} tarefa(s)</span>
        <div>
          <button type="button" className="btn btn--secondary" disabled={pagina <= 0 || loading} onClick={() => onPaginaChange(pagina - 1)}>
            Anterior
          </button>
          <span>
            Página {pagina + 1} de {totalPaginas}
          </span>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={pagina + 1 >= totalPaginas || loading}
            onClick={() => onPaginaChange(pagina + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
