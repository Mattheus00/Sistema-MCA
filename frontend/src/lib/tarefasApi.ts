import { api, getApiErrorMessage } from "@/lib/api";
import type {
  AtualizarTarefaPayload,
  ChecklistItem,
  ColunaKanban,
  CriarTarefaPayload,
  HistoricoTarefa,
  IndicadoresTarefas,
  KanbanTarefas,
  ListarTarefasParams,
  MoverTarefaPayload,
  PaginaTarefas,
  PrioridadeTarefa,
  ResponsavelTarefa,
  ResumoColaborador,
  StatusTarefa,
  TarefaDetalhe,
  TarefaResumo,
} from "@/types/tarefas";

const BASE = "/api/tarefas";

const STATUS_VALIDOS: StatusTarefa[] = ["BACKLOG", "A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "CONCLUIDO"];
/** Colunas exibidas no Kanban (Backlog oculto no front). */
const STATUS_COLUNAS_UI: StatusTarefa[] = ["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "CONCLUIDO"];
const PRIORIDADES_VALIDAS: PrioridadeTarefa[] = ["BAIXA", "MEDIA", "ALTA"];

function num(raw: unknown, fallback = 0): number {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function str(raw: unknown, fallback = ""): string {
  return raw != null ? String(raw) : fallback;
}

function bool(raw: unknown, fallback = false): boolean {
  if (raw == null) return fallback;
  if (typeof raw === "boolean") return raw;
  return String(raw).toLowerCase() === "true";
}

function asStatus(raw: unknown): StatusTarefa {
  const v = str(raw).toUpperCase() as StatusTarefa;
  return STATUS_VALIDOS.includes(v) ? v : "A_FAZER";
}

function asPrioridade(raw: unknown): PrioridadeTarefa {
  const v = str(raw).toUpperCase() as PrioridadeTarefa;
  return PRIORIDADES_VALIDAS.includes(v) ? v : "MEDIA";
}

function normalizeChecklistItem(raw: Record<string, unknown>): ChecklistItem {
  const id = raw.id ?? raw.itemId;
  return {
    id: id != null ? String(id) : "",
    descricao: str(raw.descricao),
    concluido: bool(raw.concluido ?? raw.feito),
    ordem: raw.ordem != null ? num(raw.ordem) : undefined,
  };
}

function normalizeHistorico(raw: Record<string, unknown>): HistoricoTarefa {
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    dataHora: str(raw.dataHora ?? raw.data ?? raw.criadoEm),
    usuario: raw.usuario != null ? String(raw.usuario) : raw.usuarioNome != null ? String(raw.usuarioNome) : undefined,
    acao: str(raw.acao ?? raw.tipo),
    detalhes: raw.detalhes != null ? String(raw.detalhes) : raw.descricao != null ? String(raw.descricao) : undefined,
  };
}

export function normalizeTarefaFromApi(raw: Record<string, unknown>): TarefaResumo {
  const id = raw.id ?? raw.tarefaId;
  return {
    id: id != null ? String(id) : "",
    titulo: str(raw.titulo),
    descricao: raw.descricao != null ? String(raw.descricao) : undefined,
    status: asStatus(raw.status),
    prioridade: asPrioridade(raw.prioridade),
    categoria: raw.categoria != null ? String(raw.categoria) : undefined,
    responsavelId: raw.responsavelId != null ? String(raw.responsavelId) : undefined,
    responsavelNome: raw.responsavelNome != null ? String(raw.responsavelNome) : undefined,
    dataInicio: raw.dataInicio != null ? String(raw.dataInicio) : undefined,
    dataVencimento: raw.dataVencimento != null ? String(raw.dataVencimento) : undefined,
    atrasada: bool(raw.atrasada),
    checklistConcluidos: num(raw.checklistConcluidos),
    checklistTotal: num(raw.checklistTotal),
    ordemKanban: raw.ordemKanban != null ? num(raw.ordemKanban) : undefined,
  };
}

export function normalizeTarefaDetalheFromApi(raw: Record<string, unknown>): TarefaDetalhe {
  const base = normalizeTarefaFromApi(raw);
  const checklistRaw = Array.isArray(raw.checklist) ? raw.checklist : Array.isArray(raw.checklistItens) ? raw.checklistItens : [];
  const historicoRaw = Array.isArray(raw.historico) ? raw.historico : Array.isArray(raw.historicoAlteracoes) ? raw.historicoAlteracoes : [];
  return {
    ...base,
    observacoes: raw.observacoes != null ? String(raw.observacoes) : undefined,
    criadoEm: raw.criadoEm != null ? String(raw.criadoEm) : undefined,
    atualizadoEm: raw.atualizadoEm != null ? String(raw.atualizadoEm) : undefined,
    criadoPorNome: raw.criadoPorNome != null ? String(raw.criadoPorNome) : undefined,
    checklist: checklistRaw.map((item) => normalizeChecklistItem(item as Record<string, unknown>)),
    historico: historicoRaw.map((item) => normalizeHistorico(item as Record<string, unknown>)),
  };
}

function normalizePagina(raw: unknown): PaginaTarefas {
  const data = (raw ?? {}) as Record<string, unknown>;
  const content = Array.isArray(data.content) ? data.content : Array.isArray(raw) ? (raw as unknown[]) : [];
  return {
    content: content.map((item) => normalizeTarefaFromApi(item as Record<string, unknown>)),
    totalElements: num(data.totalElements, content.length),
    totalPages: Math.max(1, num(data.totalPages, 1)),
    number: num(data.number, 0),
    size: num(data.size, content.length || 20),
  };
}

function normalizeIndicadores(raw: unknown): IndicadoresTarefas {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    emAberto: num(data.emAberto),
    emAndamento: num(data.emAndamento),
    atrasadas: num(data.atrasadas),
    concluidasNaSemana: num(data.concluidasNaSemana),
  };
}

function isKanbanColunaShape(item: Record<string, unknown>): boolean {
  return Array.isArray(item.tarefas) || Array.isArray(item.items) || Array.isArray(item.content);
}

function extrairTarefasDaColuna(coluna: Record<string, unknown>): unknown[] {
  if (Array.isArray(coluna.tarefas)) return coluna.tarefas;
  if (Array.isArray(coluna.items)) return coluna.items;
  if (Array.isArray(coluna.content)) return coluna.content;
  return [];
}

/** Remove a coluna Backlog da UI e agrupa essas tarefas em A Fazer. */
function colunasParaUi(colunas: ColunaKanban[]): ColunaKanban[] {
  const backlog = colunas.find((c) => c.status === "BACKLOG");
  return STATUS_COLUNAS_UI.map((status) => {
    const col = colunas.find((c) => c.status === status) ?? { status, tarefas: [], total: 0 };
    if (status === "A_FAZER" && backlog && backlog.tarefas.length > 0) {
      const tarefas = [...backlog.tarefas, ...col.tarefas];
      return { status, tarefas, total: tarefas.length };
    }
    return { ...col, total: col.tarefas.length };
  });
}

function normalizeKanban(raw: unknown): KanbanTarefas {
  const vazias: ColunaKanban[] = STATUS_VALIDOS.map((status) => ({
    status,
    tarefas: [],
    total: 0,
  }));

  if (raw == null) return { colunas: colunasParaUi(vazias) };

  // Formato 1: lista plana de tarefas [{ id, titulo, status: "A_FAZER", ... }]
  if (Array.isArray(raw)) {
    const items = raw as unknown[];
    if (items.length === 0) return { colunas: colunasParaUi(vazias) };

    const primeiro = (items[0] ?? {}) as Record<string, unknown>;
    const pareceListaDeTarefas =
      !isKanbanColunaShape(primeiro) &&
      (primeiro.titulo != null || primeiro.tarefaId != null || (primeiro.id != null && primeiro.status != null));

    if (pareceListaDeTarefas) {
      const porStatus = new Map<StatusTarefa, TarefaResumo[]>();
      for (const status of STATUS_VALIDOS) porStatus.set(status, []);
      for (const item of items) {
        const tarefa = normalizeTarefaFromApi(item as Record<string, unknown>);
        if (!tarefa.id) continue;
        porStatus.get(tarefa.status)?.push(tarefa);
      }
      return {
        colunas: colunasParaUi(
          STATUS_VALIDOS.map((status) => {
            const tarefas = porStatus.get(status) ?? [];
            return { status, tarefas, total: tarefas.length };
          })
        ),
      };
    }

    // Formato 2: lista de colunas [{ status, tarefas: [...] }]
    const colunas: ColunaKanban[] = STATUS_VALIDOS.map((status) => {
      const found = items.find((c) => asStatus((c as Record<string, unknown>).status) === status) as
        | Record<string, unknown>
        | undefined;
      const tarefasRaw = found ? extrairTarefasDaColuna(found) : [];
      const tarefas = tarefasRaw.map((t) => normalizeTarefaFromApi(t as Record<string, unknown>));
      return {
        status,
        tarefas,
        total: found?.total != null ? num(found.total) : tarefas.length,
      };
    });
    return { colunas: colunasParaUi(colunas) };
  }

  const data = raw as Record<string, unknown>;

  // Formato 3: { colunas: [...] }
  if (Array.isArray(data.colunas)) {
    return normalizeKanban(data.colunas);
  }

  // Formato 4: mapa { A_FAZER: [...], BACKLOG: [...] } ou { colunas: { A_FAZER: [...] } }
  const mapaFonte =
    data.colunas && typeof data.colunas === "object" && !Array.isArray(data.colunas)
      ? (data.colunas as Record<string, unknown>)
      : data;

  const chavesStatus = Object.keys(mapaFonte).filter((k) =>
    STATUS_VALIDOS.includes(k.toUpperCase() as StatusTarefa)
  );
  if (chavesStatus.length > 0) {
    const colunas: ColunaKanban[] = STATUS_VALIDOS.map((status) => {
      const bucket = mapaFonte[status] ?? mapaFonte[status.toLowerCase()];
      let tarefasRaw: unknown[] = [];
      let totalOverride: number | undefined;
      if (Array.isArray(bucket)) {
        tarefasRaw = bucket;
      } else if (bucket && typeof bucket === "object") {
        const col = bucket as Record<string, unknown>;
        tarefasRaw = extrairTarefasDaColuna(col);
        if (col.total != null) totalOverride = num(col.total);
      }
      const tarefas = tarefasRaw.map((t) => normalizeTarefaFromApi(t as Record<string, unknown>));
      return {
        status,
        tarefas,
        total: totalOverride ?? tarefas.length,
      };
    });
    return { colunas: colunasParaUi(colunas) };
  }

  return { colunas: colunasParaUi(vazias) };
}

function buildQuery(params: ListarTarefasParams): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {};
  if (params.visaoEquipe != null) query.visaoEquipe = params.visaoEquipe;
  if (params.responsavelId?.trim()) query.responsavelId = params.responsavelId.trim();
  if (params.status) query.status = params.status;
  if (params.prioridade) query.prioridade = params.prioridade;
  if (params.categoria?.trim()) query.categoria = params.categoria.trim();
  if (params.busca?.trim()) query.busca = params.busca.trim();
  if (params.dataInicio?.trim()) query.dataInicio = params.dataInicio.trim();
  if (params.dataFim?.trim()) query.dataFim = params.dataFim.trim();
  if (params.page != null) query.page = params.page;
  if (params.size != null) query.size = params.size;
  if (params.sort?.trim()) query.sort = params.sort.trim();
  return query;
}

export async function listarTarefas(params: ListarTarefasParams = {}): Promise<PaginaTarefas> {
  try {
    const r = await api.get(BASE, { params: buildQuery({ page: 0, size: 20, ...params }) });
    return normalizePagina(r.data);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar as tarefas."));
  }
}

export async function obterKanbanTarefas(params: ListarTarefasParams = {}): Promise<KanbanTarefas> {
  try {
    const r = await api.get(`${BASE}/kanban`, { params: buildQuery(params) });
    return normalizeKanban(r.data);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar o kanban."));
  }
}

export async function obterIndicadoresTarefas(params: Pick<ListarTarefasParams, "visaoEquipe" | "responsavelId"> = {}): Promise<IndicadoresTarefas> {
  try {
    const r = await api.get(`${BASE}/indicadores`, { params: buildQuery(params) });
    return normalizeIndicadores(r.data);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar os indicadores."));
  }
}

export async function listarResponsaveisTarefas(): Promise<ResponsavelTarefa[]> {
  try {
    const r = await api.get(`${BASE}/responsaveis`);
    const list = Array.isArray(r.data) ? r.data : Array.isArray((r.data as Record<string, unknown>)?.content) ? ((r.data as Record<string, unknown>).content as unknown[]) : [];
    return list.map((item) => {
      const raw = item as Record<string, unknown>;
      const id = raw.id ?? raw.usuarioId ?? raw.responsavelId;
      return {
        id: id != null ? String(id) : "",
        nome: str(raw.nome ?? raw.responsavelNome),
        perfil: raw.perfil != null ? String(raw.perfil) : undefined,
      };
    });
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar os responsáveis."));
  }
}

export async function obterResumoColaboradores(params: Pick<ListarTarefasParams, "visaoEquipe" | "responsavelId" | "status" | "prioridade" | "categoria" | "busca" | "dataInicio" | "dataFim"> = {}): Promise<ResumoColaborador[]> {
  try {
    const r = await api.get(`${BASE}/resumo-colaboradores`, { params: buildQuery(params) });
    const list = Array.isArray(r.data) ? r.data : Array.isArray((r.data as Record<string, unknown>)?.content) ? ((r.data as Record<string, unknown>).content as unknown[]) : [];
    return list.map((item) => {
      const raw = item as Record<string, unknown>;
      return {
        responsavelId: str(raw.responsavelId ?? raw.usuarioId ?? raw.id),
        responsavelNome: str(raw.responsavelNome ?? raw.nome),
        total: num(raw.totalTarefas ?? raw.total),
        emAberto: num(raw.emAberto),
        emAndamento: num(raw.emAndamento),
        atrasadas: num(raw.atrasadas),
        concluidas: num(raw.concluidas),
      };
    });
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar o resumo por colaborador."));
  }
}

export async function obterTarefa(id: string): Promise<TarefaDetalhe> {
  try {
    const r = await api.get(`${BASE}/${id}`);
    return normalizeTarefaDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar a tarefa."));
  }
}

export async function criarTarefa(payload: CriarTarefaPayload): Promise<TarefaDetalhe> {
  try {
    const r = await api.post(BASE, payload);
    return normalizeTarefaDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível criar a tarefa."));
  }
}

export async function atualizarTarefa(id: string, payload: AtualizarTarefaPayload): Promise<TarefaDetalhe> {
  try {
    const r = await api.put(`${BASE}/${id}`, payload);
    return normalizeTarefaDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível atualizar a tarefa."));
  }
}

export async function moverTarefa(id: string, payload: MoverTarefaPayload): Promise<TarefaDetalhe> {
  try {
    const r = await api.patch(`${BASE}/${id}/mover`, payload);
    return normalizeTarefaDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível mover a tarefa."));
  }
}

export async function adicionarChecklistItem(tarefaId: string, descricao: string): Promise<TarefaDetalhe> {
  try {
    const r = await api.post(`${BASE}/${tarefaId}/checklist`, { descricao });
    return normalizeTarefaDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível adicionar o item do checklist."));
  }
}

export async function toggleChecklistItem(tarefaId: string, itemId: string): Promise<TarefaDetalhe> {
  try {
    const r = await api.patch(`${BASE}/${tarefaId}/checklist/${itemId}/toggle`);
    return normalizeTarefaDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível atualizar o checklist."));
  }
}

export async function removerChecklistItem(tarefaId: string, itemId: string): Promise<TarefaDetalhe | void> {
  try {
    const r = await api.delete(`${BASE}/${tarefaId}/checklist/${itemId}`);
    if (r.data && typeof r.data === "object") {
      return normalizeTarefaDetalheFromApi(r.data as Record<string, unknown>);
    }
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível remover o item do checklist."));
  }
}
