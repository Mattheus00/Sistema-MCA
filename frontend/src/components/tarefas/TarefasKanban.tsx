import { useState } from "react";
import TarefaCard from "@/components/tarefas/TarefaCard";
import { moverTarefa } from "@/lib/tarefasApi";
import { STATUS_KANBAN, labelStatusTarefa } from "@/lib/tarefasUtils";
import type { ColunaKanban, StatusTarefa, TarefaResumo } from "@/types/tarefas";

type TarefasKanbanProps = {
  colunas: ColunaKanban[];
  loading: boolean;
  onAtualizado: () => void;
  onAbrir: (id: string) => void;
};

export default function TarefasKanban({ colunas, loading, onAtualizado, onAbrir }: TarefasKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<StatusTarefa | null>(null);
  const [movendo, setMovendo] = useState(false);
  const [erroMove, setErroMove] = useState<string | null>(null);

  function handleDragStart(e: React.DragEvent, tarefa: TarefaResumo) {
    e.dataTransfer.setData("text/tarefa-id", tarefa.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(tarefa.id);
    setErroMove(null);
  }

  function handleDragOver(e: React.DragEvent, status: StatusTarefa) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropStatus(status);
  }

  async function handleDrop(e: React.DragEvent, status: StatusTarefa, tarefas: TarefaResumo[]) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/tarefa-id") || draggingId;
    setDropStatus(null);
    setDraggingId(null);
    if (!id || movendo) return;
    const origem = colunas.find((c) => c.tarefas.some((t) => t.id === id));
    if (origem?.status === status) return;
    setMovendo(true);
    try {
      await moverTarefa(id, { status, ordemKanban: tarefas.length });
      onAtualizado();
    } catch (err: unknown) {
      setErroMove(err instanceof Error ? err.message : "Falha ao mover tarefa.");
    } finally {
      setMovendo(false);
    }
  }

  if (loading) {
    return <p className="tarefas__vazio">Carregando quadro…</p>;
  }

  const mapa = new Map(colunas.map((c) => [c.status, c]));

  return (
    <div className="tarefas-kanban">
      {erroMove && (
        <p className="tarefas__erro" role="alert">
          {erroMove}
        </p>
      )}
      <div className="tarefas-kanban__scroll">
        {STATUS_KANBAN.map((status) => {
          const coluna = mapa.get(status) ?? { status, tarefas: [], total: 0 };
          return (
            <section
              key={status}
              className={`tarefas-kanban__coluna tarefas-kanban__coluna--${status.toLowerCase()}${dropStatus === status ? " tarefas-kanban__coluna--drop" : ""}`}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={() => setDropStatus((s) => (s === status ? null : s))}
              onDrop={(e) => void handleDrop(e, status, coluna.tarefas)}
            >
              <header className="tarefas-kanban__coluna-head">
                <h3>{labelStatusTarefa(status)}</h3>
                <span>{coluna.total}</span>
              </header>
              <div className="tarefas-kanban__lista">
                {coluna.tarefas.length === 0 ? (
                  <p className="tarefas-kanban__vazia">Nenhuma tarefa</p>
                ) : (
                  coluna.tarefas.map((t) => (
                    <TarefaCard
                      key={t.id}
                      tarefa={t}
                      draggable={!movendo}
                      onDragStart={handleDragStart}
                      onClick={() => onAbrir(t.id)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
