import type { PrioridadeTarefa, StatusTarefa, TarefaResumo } from "@/types/tarefas";
import {
  formatarDataTarefa,
  iniciaisResponsavel,
  labelPrioridadeTarefa,
  labelStatusTarefa,
  progressoChecklist,
} from "@/lib/tarefasUtils";

type TarefaCardProps = {
  tarefa: TarefaResumo;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent, tarefa: TarefaResumo) => void;
};

function statusExibido(status: StatusTarefa): StatusTarefa {
  return status === "BACKLOG" ? "A_FAZER" : status;
}

function classePontoPrioridade(prioridade: PrioridadeTarefa): string {
  return `tarefas-card__pill tarefas-card__pill--prio-${prioridade.toLowerCase()}`;
}

function classePontoStatus(status: StatusTarefa): string {
  return `tarefas-card__pill tarefas-card__pill--st-${status.toLowerCase()}`;
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}

function IconPessoa() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconCalendario() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ProgressoCircular({ concluidos, total }: { concluidos: number; total: number }) {
  const progresso = progressoChecklist(concluidos, total);
  const r = 15;
  const c = 2 * Math.PI * r;
  const offset = c - (progresso / 100) * c;
  const texto = total > 0 ? `${concluidos}/${total}` : "0/0";

  return (
    <div className="tarefas-card__ring" title={total > 0 ? `${concluidos} de ${total} itens` : "Sem checklist"}>
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
        <circle className="tarefas-card__ring-track" cx="22" cy="22" r={r} />
        <circle
          className="tarefas-card__ring-fill"
          cx="22"
          cy="22"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span>{texto}</span>
    </div>
  );
}

export default function TarefaCard({ tarefa, draggable, onClick, onDragStart }: TarefaCardProps) {
  const status = statusExibido(tarefa.status);
  const iniciais = iniciaisResponsavel(tarefa.responsavelNome);

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
      <div className="tarefas-card__icons">
        <span className="tarefas-card__check" aria-hidden="true">
          <IconCheck />
        </span>
        <span className="tarefas-card__menu" aria-hidden="true">
          <IconMenu />
        </span>
      </div>

      <h3 className="tarefas-card__titulo">{tarefa.titulo}</h3>

      <div className="tarefas-card__tags">
        <span className="tarefas-card__avatar" title={tarefa.responsavelNome || "Sem responsável"}>
          {iniciais}
        </span>
        <span className={classePontoPrioridade(tarefa.prioridade)}>
          <i />
          {labelPrioridadeTarefa(tarefa.prioridade)}
        </span>
        <span className={classePontoStatus(status)}>
          <i />
          {labelStatusTarefa(status)}
        </span>
        {tarefa.atrasada && <span className="tarefas-card__atrasada">Atrasada</span>}
      </div>

      <footer className="tarefas-card__footer">
        <div className="tarefas-card__foot-item">
          <IconPessoa />
          <div>
            <small>{tarefa.responsavelNome || "Responsável"}</small>
            <strong>{iniciais}</strong>
          </div>
        </div>
        <div className="tarefas-card__foot-item">
          <IconCalendario />
          <div>
            <small>Prazo</small>
            <strong className={tarefa.atrasada ? "is-atrasado" : undefined}>
              {formatarDataTarefa(tarefa.dataVencimento)}
            </strong>
          </div>
        </div>
        <ProgressoCircular concluidos={tarefa.checklistConcluidos} total={tarefa.checklistTotal} />
      </footer>
    </article>
  );
}
