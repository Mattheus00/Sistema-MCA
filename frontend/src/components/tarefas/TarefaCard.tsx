import type { TarefaResumo } from "@/types/tarefas";
import {
  classePrioridadeTarefa,
  formatarDataTarefa,
  iniciaisResponsavel,
  labelPrioridadeTarefa,
  progressoChecklist,
  truncarTexto,
} from "@/lib/tarefasUtils";

type TarefaCardProps = {
  tarefa: TarefaResumo;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent, tarefa: TarefaResumo) => void;
};

export default function TarefaCard({ tarefa, draggable, onClick, onDragStart }: TarefaCardProps) {
  const progresso = progressoChecklist(tarefa.checklistConcluidos, tarefa.checklistTotal);

  return (
    <article
      className={`tarefas-card${tarefa.atrasada ? " tarefas-card--atrasada" : ""}`}
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart?.(e, tarefa) : undefined}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div className="tarefas-card__topo">
        <h3 className="tarefas-card__titulo">{tarefa.titulo}</h3>
        {tarefa.atrasada && <span className="tarefas-card__atrasada">Atrasada</span>}
      </div>
      {tarefa.descricao && <p className="tarefas-card__desc">{truncarTexto(tarefa.descricao, 100)}</p>}
      <div className="tarefas-card__meta">
        <span className="tarefas-card__avatar" title={tarefa.responsavelNome || "Sem responsável"}>
          {iniciaisResponsavel(tarefa.responsavelNome)}
        </span>
        <span className={classePrioridadeTarefa(tarefa.prioridade)}>{labelPrioridadeTarefa(tarefa.prioridade)}</span>
        {tarefa.categoria && <span className="tarefas-card__categoria">{tarefa.categoria}</span>}
      </div>
      <div className="tarefas-card__rodape">
        <span className="tarefas-card__prazo">{formatarDataTarefa(tarefa.dataVencimento)}</span>
        {tarefa.checklistTotal > 0 && (
          <div className="tarefas-card__checklist" title={`${tarefa.checklistConcluidos}/${tarefa.checklistTotal}`}>
            <div className="tarefas-card__checklist-bar">
              <span style={{ width: `${progresso}%` }} />
            </div>
            <em>
              {tarefa.checklistConcluidos}/{tarefa.checklistTotal}
            </em>
          </div>
        )}
      </div>
    </article>
  );
}
