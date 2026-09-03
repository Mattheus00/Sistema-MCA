import { useMemo } from "react";
import {
  corPrioridadeCalendario,
  diasNoMes,
  isoDataLocal,
  labelMesAno,
  primeiroDiaMes,
} from "@/lib/tarefasUtils";
import type { TarefaResumo } from "@/types/tarefas";

type TarefasCalendarioProps = {
  tarefas: TarefaResumo[];
  loading: boolean;
  ano: number;
  mes: number;
  onMesChange: (ano: number, mes: number) => void;
  onAbrir: (id: string) => void;
};

export default function TarefasCalendario({ tarefas, loading, ano, mes, onMesChange, onAbrir }: TarefasCalendarioProps) {
  const porDia = useMemo(() => {
    const map = new Map<string, TarefaResumo[]>();
    for (const t of tarefas) {
      if (!t.dataVencimento) continue;
      const key = t.dataVencimento.split("T")[0];
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return map;
  }, [tarefas]);

  const primeiro = primeiroDiaMes(ano, mes);
  const totalDias = diasNoMes(ano, mes);
  const offset = (primeiro.getDay() + 6) % 7; // segunda = 0

  function mesAnterior() {
    if (mes === 0) onMesChange(ano - 1, 11);
    else onMesChange(ano, mes - 1);
  }

  function mesProximo() {
    if (mes === 11) onMesChange(ano + 1, 0);
    else onMesChange(ano, mes + 1);
  }

  const celulas: Array<{ dia: number | null; iso?: string }> = [];
  for (let i = 0; i < offset; i++) celulas.push({ dia: null });
  for (let d = 1; d <= totalDias; d++) {
    const date = new Date(ano, mes, d);
    celulas.push({ dia: d, iso: isoDataLocal(date) });
  }

  return (
    <div className="tarefas-calendario">
      <header className="tarefas-calendario__nav">
        <button type="button" className="btn btn--secondary" onClick={mesAnterior} aria-label="Mês anterior">
          ‹
        </button>
        <h3>{labelMesAno(ano, mes)}</h3>
        <button type="button" className="btn btn--secondary" onClick={mesProximo} aria-label="Próximo mês">
          ›
        </button>
      </header>

      {loading ? (
        <p className="tarefas__vazio">Carregando calendário…</p>
      ) : (
        <>
          <div className="tarefas-calendario__semana" aria-hidden="true">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="tarefas-calendario__grid">
            {celulas.map((c, idx) => {
              if (c.dia == null) return <div key={`empty-${idx}`} className="tarefas-calendario__dia tarefas-calendario__dia--vazio" />;
              const itens = c.iso ? porDia.get(c.iso) ?? [] : [];
              return (
                <div key={c.iso} className="tarefas-calendario__dia">
                  <span className="tarefas-calendario__num">{c.dia}</span>
                  <div className="tarefas-calendario__itens">
                    {itens.length === 0 ? null : (
                      itens.slice(0, 3).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`tarefas-calendario__item${t.atrasada ? " tarefas-calendario__item--atrasada" : ""}`}
                          style={{ borderLeftColor: corPrioridadeCalendario(t.prioridade) }}
                          onClick={() => onAbrir(t.id)}
                          title={t.titulo}
                        >
                          {t.titulo}
                        </button>
                      ))
                    )}
                    {itens.length > 3 && <span className="tarefas-calendario__mais">+{itens.length - 3}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {tarefas.filter((t) => t.dataVencimento).length === 0 && (
            <p className="tarefas__vazio">Nenhuma tarefa com prazo neste período.</p>
          )}
        </>
      )}
    </div>
  );
}
