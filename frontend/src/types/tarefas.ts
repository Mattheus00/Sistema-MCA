export type StatusTarefa = "BACKLOG" | "A_FAZER" | "EM_ANDAMENTO" | "EM_REVISAO" | "CONCLUIDO";

export type PrioridadeTarefa = "BAIXA" | "MEDIA" | "ALTA";

export type ModoVisualizacaoTarefas = "kanban" | "lista" | "calendario";

export type ChecklistItem = {
  id: string;
  descricao: string;
  concluido: boolean;
  ordem?: number;
};

export type HistoricoTarefa = {
  id?: string;
  dataHora: string;
  usuario?: string;
  acao: string;
  detalhes?: string;
};

export type TarefaResumo = {
  id: string;
  titulo: string;
  descricao?: string;
  status: StatusTarefa;
  prioridade: PrioridadeTarefa;
  categoria?: string;
  responsavelId?: string;
  responsavelNome?: string;
  dataInicio?: string;
  dataVencimento?: string;
  atrasada: boolean;
  checklistConcluidos: number;
  checklistTotal: number;
  ordemKanban?: number;
};

export type TarefaDetalhe = TarefaResumo & {
  observacoes?: string;
  checklist: ChecklistItem[];
  historico: HistoricoTarefa[];
  criadoEm?: string;
  atualizadoEm?: string;
  criadoPorNome?: string;
};

export type IndicadoresTarefas = {
  emAberto: number;
  emAndamento: number;
  atrasadas: number;
  concluidasNaSemana: number;
};

export type ResponsavelTarefa = {
  id: string;
  nome: string;
  perfil?: string;
};

export type ResumoColaborador = {
  responsavelId: string;
  responsavelNome: string;
  total: number;
  emAberto: number;
  emAndamento: number;
  atrasadas: number;
  concluidas: number;
};

export type ColunaKanban = {
  status: StatusTarefa;
  tarefas: TarefaResumo[];
  total: number;
};

export type KanbanTarefas = {
  colunas: ColunaKanban[];
};

export type PaginaTarefas = {
  content: TarefaResumo[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type ListarTarefasParams = {
  visaoEquipe?: boolean;
  responsavelId?: string;
  status?: StatusTarefa | "";
  prioridade?: PrioridadeTarefa | "";
  categoria?: string;
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  size?: number;
  sort?: string;
};

export type CriarTarefaPayload = {
  titulo: string;
  descricao?: string;
  responsavelId?: string;
  status?: StatusTarefa;
  prioridade?: PrioridadeTarefa;
  categoria?: string;
  dataInicio?: string;
  dataVencimento?: string;
  observacoes?: string;
  checklistItens?: string[];
};

export type AtualizarTarefaPayload = CriarTarefaPayload;

export type MoverTarefaPayload = {
  status: StatusTarefa;
  ordemKanban?: number;
};
