import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import TarefaDetalheModal from "@/components/tarefas/TarefaDetalheModal";
import TarefaFormModal from "@/components/tarefas/TarefaFormModal";
import TarefasCalendario from "@/components/tarefas/TarefasCalendario";
import TarefasKanban from "@/components/tarefas/TarefasKanban";
import TarefasLista from "@/components/tarefas/TarefasLista";
import { getAuthUserProfile } from "@/lib/api";
import {
  atualizarTarefa,
  criarTarefa,
  listarResponsaveisTarefas,
  listarTarefas,
  obterIndicadoresTarefas,
  obterKanbanTarefas,
  obterResumoColaboradores,
  obterTarefa,
} from "@/lib/tarefasApi";
import {
  labelPrioridadeTarefa,
  labelStatusTarefa,
  lerModoVisualizacaoSalvo,
  salvarModoVisualizacao,
  STATUS_KANBAN,
} from "@/lib/tarefasUtils";
import type {
  ColunaKanban,
  CriarTarefaPayload,
  IndicadoresTarefas,
  ModoVisualizacaoTarefas,
  PrioridadeTarefa,
  ResponsavelTarefa,
  ResumoColaborador,
  StatusTarefa,
  TarefaDetalhe,
  TarefaResumo,
} from "@/types/tarefas";

function IconAberto() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function IconAndamento() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconAtraso() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconConcluido() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function WebTarefas() {
  const perfil = getAuthUserProfile();
  const isFuncionario = perfil === "FUNCIONARIO";
  const isGestor = perfil === "PROPRIETARIA" || perfil === "RESPONSAVEL_FINANCEIRO";

  const [modo, setModo] = useState<ModoVisualizacaoTarefas>(() => lerModoVisualizacaoSalvo());
  const [visaoEquipe, setVisaoEquipe] = useState(false);
  const [responsavelId, setResponsavelId] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusTarefa | "">("");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<PrioridadeTarefa | "">("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");

  const [indicadores, setIndicadores] = useState<IndicadoresTarefas | null>(null);
  const [colunas, setColunas] = useState<ColunaKanban[]>([]);
  const [lista, setLista] = useState<TarefaResumo[]>([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);
  const [responsaveis, setResponsaveis] = useState<ResponsavelTarefa[]>([]);
  const [resumoColabs, setResumoColabs] = useState<ResumoColaborador[]>([]);

  const hoje = new Date();
  const [calAno, setCalAno] = useState(hoje.getFullYear());
  const [calMes, setCalMes] = useState(hoje.getMonth());

  const [loadingIndicadores, setLoadingIndicadores] = useState(true);
  const [loadingConteudo, setLoadingConteudo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [modalForm, setModalForm] = useState<"criar" | "editar" | null>(null);
  const [detalhe, setDetalhe] = useState<TarefaDetalhe | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const filtrosBase = useMemo(
    () => ({
      visaoEquipe: isGestor ? visaoEquipe : false,
      responsavelId: isGestor && visaoEquipe && responsavelId ? responsavelId : undefined,
      status: statusFiltro || undefined,
      prioridade: prioridadeFiltro || undefined,
      categoria: categoriaFiltro || undefined,
      busca: buscaAplicada || undefined,
    }),
    [isGestor, visaoEquipe, responsavelId, statusFiltro, prioridadeFiltro, categoriaFiltro, buscaAplicada]
  );

  const carregarIndicadores = useCallback(async () => {
    setLoadingIndicadores(true);
    try {
      const data = await obterIndicadoresTarefas({
        visaoEquipe: filtrosBase.visaoEquipe,
        responsavelId: filtrosBase.responsavelId,
      });
      setIndicadores(data);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar indicadores.");
    } finally {
      setLoadingIndicadores(false);
    }
  }, [filtrosBase.visaoEquipe, filtrosBase.responsavelId]);

  const carregarConteudo = useCallback(async () => {
    setLoadingConteudo(true);
    setErro(null);
    try {
      if (modo === "kanban") {
        const data = await obterKanbanTarefas(filtrosBase);
        setColunas(data.colunas);
      } else {
        const data = await listarTarefas({
          ...filtrosBase,
          page: modo === "lista" ? pagina : 0,
          size: modo === "lista" ? 20 : 200,
          sort: "dataVencimento,asc",
        });
        setLista(data.content);
        setTotalPaginas(Math.max(1, data.totalPages));
        setTotalElementos(data.totalElements);
      }

      if (isGestor && visaoEquipe) {
        try {
          const resumo = await obterResumoColaboradores(filtrosBase);
          setResumoColabs(resumo);
        } catch {
          setResumoColabs([]);
        }
      } else {
        setResumoColabs([]);
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar tarefas.");
    } finally {
      setLoadingConteudo(false);
    }
  }, [modo, pagina, filtrosBase, isGestor, visaoEquipe]);

  useEffect(() => {
    if (!isGestor) return;
    void listarResponsaveisTarefas()
      .then(setResponsaveis)
      .catch(() => setResponsaveis([]));
  }, [isGestor]);

  useEffect(() => {
    void carregarIndicadores();
  }, [carregarIndicadores]);

  useEffect(() => {
    void carregarConteudo();
  }, [carregarConteudo]);

  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => setSucesso(null), 3500);
    return () => clearTimeout(t);
  }, [sucesso]);

  function mudarModo(novo: ModoVisualizacaoTarefas) {
    setModo(novo);
    salvarModoVisualizacao(novo);
    setPagina(0);
  }

  function aplicarBusca() {
    setBuscaAplicada(busca.trim());
    setPagina(0);
  }

  async function abrirDetalhe(id: string) {
    setCarregandoDetalhe(true);
    try {
      const t = await obterTarefa(id);
      setDetalhe(t);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao abrir tarefa.");
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  async function abrirEdicao(id: string) {
    setCarregandoDetalhe(true);
    try {
      const t = await obterTarefa(id);
      setDetalhe(t);
      setModalForm("editar");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao abrir tarefa.");
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  async function salvarForm(payload: CriarTarefaPayload) {
    setSalvando(true);
    try {
      if (modalForm === "editar" && detalhe) {
        const atualizado = await atualizarTarefa(detalhe.id, payload);
        setDetalhe(atualizado);
        setSucesso("Tarefa atualizada.");
      } else {
        await criarTarefa(payload);
        setSucesso("Tarefa criada.");
      }
      setModalForm(null);
      await Promise.all([carregarIndicadores(), carregarConteudo()]);
    } finally {
      setSalvando(false);
    }
  }

  const subtitulo = isFuncionario
    ? "Organize suas atividades, responsáveis e prazos em um único lugar."
    : "Organize as tarefas da equipe e acompanhe atividades por responsável, prioridade e prazo.";

  return (
    <div className="tarefas">
      <header className="tarefas__head">
        <div>
          <p className="tarefas__contexto">Sistema de Gestão de Inadimplentes</p>
          <h1 className="tarefas__titulo">Gestão de Tarefas</h1>
          <p className="tarefas__subtitulo">{subtitulo}</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => { setDetalhe(null); setModalForm("criar"); }}>
          + Nova tarefa
        </button>
      </header>

      {sucesso && (
        <p className="toast toast--sucesso toast--flutuante" role="status">
          {sucesso}
        </p>
      )}
      {erro && (
        <p className="tarefas__erro" role="alert">
          {erro}
        </p>
      )}

      <div className="dash-metrics tarefas__metrics">
        <MetricCard icon={<IconAberto />} label="Em aberto" value={String(indicadores?.emAberto ?? 0)} loading={loadingIndicadores} iconTone="purple" />
        <MetricCard icon={<IconAndamento />} label="Em andamento" value={String(indicadores?.emAndamento ?? 0)} loading={loadingIndicadores} iconTone="money" />
        <MetricCard icon={<IconAtraso />} label="Atrasadas" value={String(indicadores?.atrasadas ?? 0)} loading={loadingIndicadores} iconTone="alert" hintTone="danger" />
        <MetricCard icon={<IconConcluido />} label="Concluídas na semana" value={String(indicadores?.concluidasNaSemana ?? 0)} loading={loadingIndicadores} iconTone="wallet" />
      </div>

      <div className="tarefas__toolbar">
        {isGestor && (
          <div className="tarefas__toggle" role="group" aria-label="Visão">
            <button type="button" className={!visaoEquipe ? "is-active" : ""} onClick={() => { setVisaoEquipe(false); setResponsavelId(""); setPagina(0); }}>
              Minhas tarefas
            </button>
            <button type="button" className={visaoEquipe ? "is-active" : ""} onClick={() => { setVisaoEquipe(true); setPagina(0); }}>
              Equipe
            </button>
          </div>
        )}

        <div className="tarefas__modos" role="group" aria-label="Modo de visualização">
          {([
            ["kanban", "Kanban"],
            ["lista", "Lista"],
            ["calendario", "Calendário"],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" className={modo === id ? "is-active" : ""} onClick={() => mudarModo(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="tarefas__filtros">
        <input
          className="modal__input"
          placeholder="Buscar tarefas…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && aplicarBusca()}
        />
        <select className="modal__input" value={prioridadeFiltro} onChange={(e) => { setPrioridadeFiltro(e.target.value as PrioridadeTarefa | ""); setPagina(0); }}>
          <option value="">Prioridade</option>
          {(["BAIXA", "MEDIA", "ALTA"] as PrioridadeTarefa[]).map((p) => (
            <option key={p} value={p}>{labelPrioridadeTarefa(p)}</option>
          ))}
        </select>
        <select className="modal__input" value={statusFiltro} onChange={(e) => { setStatusFiltro(e.target.value as StatusTarefa | ""); setPagina(0); }}>
          <option value="">Status</option>
          {STATUS_KANBAN.map((s) => (
            <option key={s} value={s}>{labelStatusTarefa(s)}</option>
          ))}
        </select>
        <input
          className="modal__input"
          placeholder="Cliente"
          value={categoriaFiltro}
          onChange={(e) => { setCategoriaFiltro(e.target.value); setPagina(0); }}
        />
        {isGestor && visaoEquipe && (
          <select className="modal__input" value={responsavelId} onChange={(e) => { setResponsavelId(e.target.value); setPagina(0); }}>
            <option value="">Responsável</option>
            {responsaveis.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
          </select>
        )}
        <button type="button" className="btn btn--secondary" onClick={aplicarBusca}>
          Filtrar
        </button>
      </div>

      {isGestor && visaoEquipe && resumoColabs.length > 0 && (
        <div className="tarefas__resumo-colabs">
          {resumoColabs.map((c) => (
            <button
              key={c.responsavelId}
              type="button"
              className={`tarefas__colab-card${responsavelId === c.responsavelId ? " is-active" : ""}`}
              onClick={() => setResponsavelId((atual) => (atual === c.responsavelId ? "" : c.responsavelId))}
            >
              <strong>{c.responsavelNome}</strong>
              <span>{c.total} tarefas</span>
              <em>
                {c.emAndamento} andamento · {c.atrasadas} atrasadas
              </em>
            </button>
          ))}
        </div>
      )}

      {modo === "kanban" && (
        <TarefasKanban
          colunas={colunas}
          loading={loadingConteudo}
          onAtualizado={() => { void carregarIndicadores(); void carregarConteudo(); }}
          onAbrir={(id) => void abrirDetalhe(id)}
        />
      )}

      {modo === "lista" && (
        <TarefasLista
          tarefas={lista}
          loading={loadingConteudo}
          pagina={pagina}
          totalPaginas={totalPaginas}
          totalElementos={totalElementos}
          onPaginaChange={setPagina}
          onAbrir={(id) => void abrirDetalhe(id)}
          onEditar={(id) => void abrirEdicao(id)}
        />
      )}

      {modo === "calendario" && (
        <TarefasCalendario
          tarefas={lista}
          loading={loadingConteudo}
          ano={calAno}
          mes={calMes}
          onMesChange={(a, m) => { setCalAno(a); setCalMes(m); }}
          onAbrir={(id) => void abrirDetalhe(id)}
        />
      )}

      <TarefaFormModal
        aberto={modalForm !== null}
        modo={modalForm === "editar" ? "editar" : "criar"}
        tarefa={modalForm === "editar" ? detalhe : null}
        responsaveis={responsaveis}
        podeEscolherResponsavel={isGestor && (modalForm === "editar" || visaoEquipe)}
        salvando={salvando}
        onFechar={() => !salvando && setModalForm(null)}
        onSalvar={salvarForm}
      />

      <TarefaDetalheModal
        tarefa={modalForm ? null : detalhe}
        carregando={carregandoDetalhe}
        onFechar={() => setDetalhe(null)}
        onEditar={(t) => { setDetalhe(t); setModalForm("editar"); }}
        onAtualizado={(t) => {
          setDetalhe(t);
          void carregarIndicadores();
          void carregarConteudo();
        }}
      />
    </div>
  );
}
