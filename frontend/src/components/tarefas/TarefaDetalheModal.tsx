import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  adicionarChecklistItem,
  removerChecklistItem,
  toggleChecklistItem,
} from "@/lib/tarefasApi";
import {
  classePrioridadeTarefa,
  classeStatusTarefa,
  formatarDataTarefa,
  iniciaisResponsavel,
  labelPrioridadeTarefa,
  labelStatusTarefa,
  progressoChecklist,
} from "@/lib/tarefasUtils";
import type { TarefaDetalhe } from "@/types/tarefas";

type TarefaDetalheModalProps = {
  tarefa: TarefaDetalhe | null;
  carregando: boolean;
  onFechar: () => void;
  onEditar: (t: TarefaDetalhe) => void;
  onAtualizado: (t: TarefaDetalhe) => void;
};

function IconFechar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconLixeira() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function MetaItem({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className={`tarefas-detalhe__meta-item${destaque ? " tarefas-detalhe__meta-item--destaque" : ""}`}>
      <span className="tarefas-detalhe__meta-label">{label}</span>
      <strong className="tarefas-detalhe__meta-value">{value}</strong>
    </div>
  );
}

export default function TarefaDetalheModal({
  tarefa,
  carregando,
  onFechar,
  onEditar,
  onAtualizado,
}: TarefaDetalheModalProps) {
  const tituloId = useId();
  const [novoItem, setNovoItem] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  useEffect(() => {
    if (!tarefa) return;
    document.body.style.overflow = "hidden";
    setErro(null);
    setNovoItem("");
    setHistoricoAberto(false);
    return () => {
      document.body.style.overflow = "";
    };
  }, [tarefa?.id]);

  if (!tarefa) return null;

  const progresso = progressoChecklist(tarefa.checklistConcluidos, tarefa.checklistTotal);
  const historicoOrdenado = [...tarefa.historico].reverse();
  const historicoVisivel = historicoAberto ? historicoOrdenado : historicoOrdenado.slice(0, 4);

  async function addItem() {
    if (!tarefa || !novoItem.trim() || busy) return;
    setBusy(true);
    setErro(null);
    try {
      const atualizado = await adicionarChecklistItem(tarefa.id, novoItem.trim());
      onAtualizado(atualizado);
      setNovoItem("");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao adicionar item.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleItem(itemId: string) {
    if (!tarefa || busy) return;
    setBusy(true);
    setErro(null);
    try {
      const atualizado = await toggleChecklistItem(tarefa.id, itemId);
      onAtualizado(atualizado);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar item.");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    if (!tarefa || busy) return;
    setBusy(true);
    setErro(null);
    try {
      const atualizado = await removerChecklistItem(tarefa.id, itemId);
      if (atualizado) onAtualizado(atualizado);
      else {
        onAtualizado({
          ...tarefa,
          checklist: tarefa.checklist.filter((i) => i.id !== itemId),
          checklistTotal: Math.max(0, tarefa.checklistTotal - 1),
          checklistConcluidos: tarefa.checklist.filter((i) => i.id !== itemId && i.concluido).length,
        });
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao remover item.");
    } finally {
      setBusy(false);
    }
  }

  const modal = (
    <div className="modal-overlay" onClick={() => !busy && onFechar()}>
      <div
        className="tarefas-detalhe"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
      >
        <header className="tarefas-detalhe__header">
          <div className="tarefas-detalhe__header-main">
            <div className="tarefas-detalhe__badges">
              <span className={classeStatusTarefa(tarefa.status)}>{labelStatusTarefa(tarefa.status)}</span>
              <span className={classePrioridadeTarefa(tarefa.prioridade)}>{labelPrioridadeTarefa(tarefa.prioridade)}</span>
              {tarefa.atrasada && <span className="tarefas-card__atrasada">Atrasada</span>}
            </div>
            <h2 id={tituloId} className="tarefas-detalhe__titulo">
              {tarefa.titulo}
            </h2>
            {tarefa.descricao && <p className="tarefas-detalhe__desc">{tarefa.descricao}</p>}
          </div>
          <button
            type="button"
            className="tarefas-detalhe__fechar"
            onClick={onFechar}
            disabled={busy}
            aria-label="Fechar"
          >
            <IconFechar />
          </button>
        </header>

        {carregando && <p className="tarefas-detalhe__loading">Atualizando…</p>}
        {erro && (
          <p className="tarefas-detalhe__erro" role="alert">
            {erro}
          </p>
        )}

        <div className="tarefas-detalhe__body">
          <section className="tarefas-detalhe__secao">
            <div className="tarefas-detalhe__meta">
              <div className="tarefas-detalhe__meta-item tarefas-detalhe__meta-item--pessoa">
                <span className="tarefas-detalhe__avatar" aria-hidden="true">
                  {iniciaisResponsavel(tarefa.responsavelNome)}
                </span>
                <div>
                  <span className="tarefas-detalhe__meta-label">Responsável</span>
                  <strong className="tarefas-detalhe__meta-value">{tarefa.responsavelNome ?? "—"}</strong>
                </div>
              </div>
              <MetaItem label="Cliente" value={tarefa.categoria ?? "—"} />
              <MetaItem label="Início" value={formatarDataTarefa(tarefa.dataInicio)} />
              <MetaItem label="Prazo" value={formatarDataTarefa(tarefa.dataVencimento)} destaque={tarefa.atrasada} />
            </div>
          </section>

          {tarefa.observacoes && (
            <section className="tarefas-detalhe__secao">
              <h3 className="tarefas-detalhe__secao-titulo">Observações</h3>
              <p className="tarefas-detalhe__obs-texto">{tarefa.observacoes}</p>
            </section>
          )}

          <section className="tarefas-detalhe__secao">
            <div className="tarefas-detalhe__secao-head">
              <h3 className="tarefas-detalhe__secao-titulo">Checklist</h3>
              <span className="tarefas-detalhe__progresso-label">
                {tarefa.checklistConcluidos}/{tarefa.checklistTotal}
                {tarefa.checklistTotal > 0 ? ` · ${progresso}%` : ""}
              </span>
            </div>

            {tarefa.checklistTotal > 0 && (
              <div className="tarefas-detalhe__barra" aria-hidden="true">
                <span style={{ width: `${progresso}%` }} />
              </div>
            )}

            <ul className="tarefas-detalhe__checklist">
              {tarefa.checklist.length === 0 ? (
                <li className="tarefas-detalhe__checklist-vazio">Nenhum item no checklist ainda.</li>
              ) : (
                tarefa.checklist.map((item) => (
                  <li key={item.id} className={item.concluido ? "is-feito" : ""}>
                    <label className="tarefas-detalhe__check-label">
                      <input
                        type="checkbox"
                        checked={item.concluido}
                        disabled={busy}
                        onChange={() => void toggleItem(item.id)}
                      />
                      <span className={item.concluido ? "tarefas-detalhe__check--feito" : ""}>{item.descricao}</span>
                    </label>
                    <button
                      type="button"
                      className="tarefas-detalhe__check-remover"
                      disabled={busy}
                      onClick={() => void removeItem(item.id)}
                      aria-label="Remover item"
                      title="Remover"
                    >
                      <IconLixeira />
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="tarefas-detalhe__add-check">
              <input
                className="tarefas-detalhe__input"
                value={novoItem}
                onChange={(e) => setNovoItem(e.target.value)}
                placeholder="Adicionar item ao checklist..."
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addItem();
                  }
                }}
              />
              <button
                type="button"
                className="tarefas-detalhe__add-btn"
                disabled={busy || !novoItem.trim()}
                onClick={() => void addItem()}
              >
                + Adicionar
              </button>
            </div>
          </section>

          {tarefa.historico.length > 0 && (
            <section className="tarefas-detalhe__secao">
              <div className="tarefas-detalhe__secao-head">
                <h3 className="tarefas-detalhe__secao-titulo">Histórico</h3>
                <span className="tarefas-detalhe__progresso-label">{tarefa.historico.length} eventos</span>
              </div>
              <ol className="tarefas-detalhe__timeline">
                {historicoVisivel.map((h, i) => (
                  <li key={h.id ?? i}>
                    <span className="tarefas-detalhe__timeline-dot" aria-hidden="true" />
                    <div className="tarefas-detalhe__timeline-content">
                      <div className="tarefas-detalhe__timeline-top">
                        <strong>{h.acao}</strong>
                        <time>{formatarDataTarefa(h.dataHora)}</time>
                      </div>
                      {h.usuario && <span className="tarefas-detalhe__timeline-user">{h.usuario}</span>}
                      {h.detalhes && <p>{h.detalhes}</p>}
                    </div>
                  </li>
                ))}
              </ol>
              {historicoOrdenado.length > 4 && (
                <button
                  type="button"
                  className="tarefas-detalhe__mais-historico"
                  onClick={() => setHistoricoAberto((v) => !v)}
                >
                  {historicoAberto ? "Mostrar menos" : `Ver mais ${historicoOrdenado.length - 4} eventos`}
                </button>
              )}
            </section>
          )}
        </div>

        <footer className="tarefas-detalhe__footer">
          <button type="button" className="btn btn--secondary" onClick={onFechar} disabled={busy}>
            Fechar
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onEditar(tarefa)} disabled={busy}>
            Editar tarefa
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
