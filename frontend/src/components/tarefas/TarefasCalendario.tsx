import { useMemo, useState } from "react";
import {
  corFaixaCalendario,
  diasNoMes,
  formatarDataTarefa,
  iniciaisResponsavel,
  isoDataLocal,
  labelMesAno,
  labelRelativoPrazo,
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

type CelulaCalendario = {
  dia: number;
  iso: string;
  foraDoMes: boolean;
};

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MAX_ITENS_CELULA = 2;

function IconChevron({ dir }: { dir: "esq" | "dir" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {dir === "esq" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );
}

function IconBandeira({ cor }: { cor: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={cor} aria-hidden="true">
      <path d="M5 3v18M5 4h11l-1.5 4L16 12H5" />
    </svg>
  );
}

function montarCelulas(ano: number, mes: number): CelulaCalendario[] {
  const primeiro = primeiroDiaMes(ano, mes);
  const offset = (primeiro.getDay() + 6) % 7;
  const totalDias = diasNoMes(ano, mes);
  const celulas: CelulaCalendario[] = [];

  for (let i = offset; i > 0; i--) {
    const d = new Date(ano, mes, 1 - i);
    celulas.push({ dia: d.getDate(), iso: isoDataLocal(d), foraDoMes: true });
  }
  for (let d = 1; d <= totalDias; d++) {
    const date = new Date(ano, mes, d);
    celulas.push({ dia: d, iso: isoDataLocal(date), foraDoMes: false });
  }
  let proximoDia = 1;
  while (celulas.length % 7 !== 0) {
    const d = new Date(ano, mes + 1, proximoDia++);
    celulas.push({ dia: d.getDate(), iso: isoDataLocal(d), foraDoMes: true });
  }
  return celulas;
}

export default function TarefasCalendario({
  tarefas,
  loading,
  ano,
  mes,
  onMesChange,
  onAbrir,
}: TarefasCalendarioProps) {
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const hojeIso = isoDataLocal(new Date());
  const prefixoMes = `${ano}-${String(mes + 1).padStart(2, "0")}`;

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

  const doMes = useMemo(
    () => tarefas.filter((t) => t.dataVencimento?.startsWith(prefixoMes)),
    [tarefas, prefixoMes]
  );

  const resumoMes = useMemo(() => {
    return {
      total: doMes.length,
      atrasadas: doMes.filter((t) => t.atrasada).length,
      concluidas: doMes.filter((t) => t.status === "CONCLUIDO").length,
      hoje: (porDia.get(hojeIso) ?? []).length,
    };
  }, [doMes, porDia, hojeIso]);

  const proximos = useMemo(() => {
    return tarefas
      .filter((t) => t.dataVencimento && !t.atrasada && t.status !== "CONCLUIDO" && t.dataVencimento.split("T")[0] >= hojeIso)
      .sort((a, b) => String(a.dataVencimento).localeCompare(String(b.dataVencimento)))
      .slice(0, 4);
  }, [tarefas, hojeIso]);

  const atrasadas = useMemo(() => {
    return tarefas
      .filter((t) => t.atrasada && t.status !== "CONCLUIDO")
      .sort((a, b) => String(a.dataVencimento).localeCompare(String(b.dataVencimento)))
      .slice(0, 4);
  }, [tarefas]);

  const celulas = useMemo(() => montarCelulas(ano, mes), [ano, mes]);

  function mesAnterior() {
    if (mes === 0) onMesChange(ano - 1, 11);
    else onMesChange(ano, mes - 1);
  }

  function mesProximo() {
    if (mes === 11) onMesChange(ano + 1, 0);
    else onMesChange(ano, mes + 1);
  }

  function irParaHoje() {
    const agora = new Date();
    onMesChange(agora.getFullYear(), agora.getMonth());
    setDiaSelecionado(hojeIso);
  }

  return (
    <div className="tarefas-cal">
      <div className="tarefas-cal__chips">
        <span className="tarefas-cal__chip tarefas-cal__chip--azul">{resumoMes.total} tarefas este mês</span>
        <span className="tarefas-cal__chip tarefas-cal__chip--vermelho">{resumoMes.atrasadas} atrasadas</span>
        <span className="tarefas-cal__chip tarefas-cal__chip--verde">{resumoMes.concluidas} concluídas</span>
        <span className="tarefas-cal__chip tarefas-cal__chip--roxo">{resumoMes.hoje} hoje</span>
      </div>

      <div className="tarefas-cal__toolbar">
        <div className="tarefas-cal__nav">
          <button type="button" className="tarefas-cal__nav-btn" onClick={mesAnterior} aria-label="Mês anterior">
            <IconChevron dir="esq" />
          </button>
          <h3>{labelMesAno(ano, mes)}</h3>
          <button type="button" className="tarefas-cal__nav-btn" onClick={mesProximo} aria-label="Próximo mês">
            <IconChevron dir="dir" />
          </button>
          <button type="button" className="tarefas-cal__hoje" onClick={irParaHoje}>
            Hoje
          </button>
        </div>
      </div>

      {loading ? (
        <p className="tarefas__vazio">Carregando calendário…</p>
      ) : (
        <div className="tarefas-cal__layout">
          <div className="tarefas-cal__board">
            <div className="tarefas-cal__semana" aria-hidden="true">
              {DIAS_SEMANA.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="tarefas-cal__grid">
              {celulas.map((c) => {
                const itens = porDia.get(c.iso) ?? [];
                const ehHoje = c.iso === hojeIso;
                const selecionado = c.iso === diaSelecionado;
                return (
                  <div
                    key={c.iso}
                    className={`tarefas-cal__dia${c.foraDoMes ? " is-fora" : ""}${ehHoje ? " is-hoje" : ""}${selecionado ? " is-sel" : ""}`}
                    onClick={() => setDiaSelecionado(c.iso)}
                  >
                    <span className={`tarefas-cal__num${ehHoje ? " is-hoje" : ""}`}>{c.dia}</span>
                    <div className="tarefas-cal__itens">
                      {itens.slice(0, MAX_ITENS_CELULA).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`tarefas-cal__item${t.atrasada ? " is-atrasada" : ""}${t.status === "CONCLUIDO" ? " is-feita" : ""}`}
                          style={{ borderLeftColor: corFaixaCalendario(t) }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAbrir(t.id);
                          }}
                          title={t.titulo}
                        >
                          {t.titulo}
                        </button>
                      ))}
                      {itens.length > MAX_ITENS_CELULA && (
                        <button
                          type="button"
                          className="tarefas-cal__mais"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDiaSelecionado(c.iso);
                          }}
                        >
                          + {itens.length - MAX_ITENS_CELULA} mais
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="tarefas-cal__side">
            {diaSelecionado && (porDia.get(diaSelecionado) ?? []).length > 0 && (
              <section>
                <h4>Neste dia · {formatarDataTarefa(diaSelecionado)}</h4>
                <ul>
                  {(porDia.get(diaSelecionado) ?? []).map((t) => (
                    <li key={t.id}>
                      <button type="button" className="tarefas-cal__side-item" onClick={() => onAbrir(t.id)}>
                        <div>
                          <strong>{t.titulo}</strong>
                          <span>
                            <em className="tarefas-cal__avatar">{iniciaisResponsavel(t.responsavelNome)}</em>
                            {t.responsavelNome ?? "Sem responsável"}
                          </span>
                        </div>
                        <IconBandeira cor={corFaixaCalendario(t)} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h4>Próximos prazos</h4>
              {proximos.length === 0 ? (
                <p className="tarefas-cal__vazio">Nenhum prazo próximo.</p>
              ) : (
                <ul>
                  {proximos.map((t) => (
                    <li key={t.id}>
                      <button type="button" className="tarefas-cal__side-item" onClick={() => onAbrir(t.id)}>
                        <div>
                          <small>{labelRelativoPrazo(t.dataVencimento)}</small>
                          <strong>{t.titulo}</strong>
                          <span>
                            <em className="tarefas-cal__avatar">{iniciaisResponsavel(t.responsavelNome)}</em>
                            {t.responsavelNome ?? "Sem responsável"}
                          </span>
                        </div>
                        <IconBandeira cor={corFaixaCalendario(t)} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h4>Atrasadas</h4>
              {atrasadas.length === 0 ? (
                <p className="tarefas-cal__vazio">Nenhuma tarefa atrasada.</p>
              ) : (
                <ul>
                  {atrasadas.map((t) => (
                    <li key={t.id}>
                      <button type="button" className="tarefas-cal__side-item is-atrasada" onClick={() => onAbrir(t.id)}>
                        <div>
                          <small>Atrasada desde {formatarDataTarefa(t.dataVencimento)}</small>
                          <strong>{t.titulo}</strong>
                          <span>
                            <em className="tarefas-cal__avatar">{iniciaisResponsavel(t.responsavelNome)}</em>
                            {t.responsavelNome ?? "Sem responsável"}
                          </span>
                        </div>
                        <IconBandeira cor="#dc2626" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="tarefas-cal__legenda">
              <h4>Legenda</h4>
              <ul>
                <li><i className="dot dot-red" /> Alta prioridade / atrasada</li>
                <li><i className="dot dot-orange" /> Em andamento</li>
                <li><i className="dot dot-blue" /> A fazer</li>
                <li><i className="dot dot-purple" /> Em revisão</li>
                <li><i className="dot dot-green" /> Concluída</li>
              </ul>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
