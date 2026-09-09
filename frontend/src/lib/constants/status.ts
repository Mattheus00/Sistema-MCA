/**
 * Status canônicos alinhados aos enums Java em
 * `backend/src/main/java/com/pucminas/sgi/enums/`.
 * Aliases extras do front/mock estão documentados no comentário de cada bloco.
 */

export const STATUS_CLIENTE = {
  ATIVO: "ATIVO",
  INATIVO: "INATIVO",
  /** Filtro da API (não está no enum Java StatusCliente, só ATIVO/INATIVO). */
  INADIMPLENTE: "INADIMPLENTE",
} as const;
export type StatusClienteConst = (typeof STATUS_CLIENTE)[keyof typeof STATUS_CLIENTE];

/** Espelha StatusDivida. */
export const STATUS_DIVIDA = {
  EM_ABERTO: "EM_ABERTO",
  PARCIAL: "PARCIAL",
  QUITADA: "QUITADA",
  VENCIDA: "VENCIDA",
  CANCELADA: "CANCELADA",
} as const;
export type StatusDividaConst = (typeof STATUS_DIVIDA)[keyof typeof STATUS_DIVIDA];

/**
 * Valores que o front persiste/exibe em `Inadimplencia.status`
 * (InadimplenciaService ainda devolve "Pago" | "EmAberto" | "Acordo").
 */
export const STATUS_DIVIDA_FRONT = {
  EM_ABERTO: "EmAberto",
  PAGO: "Pago",
  ACORDO: "Acordo",
  PARCIAL: "PARCIAL",
} as const;

/** Pagamento de dívida / cobrança (não há enum Java de status de Pagamento). */
export const STATUS_PAGAMENTO = {
  PAGO: "PAGO",
  PARCIAL: "PARCIAL",
  PENDENTE: "PENDENTE",
} as const;

export const METODO_PAGAMENTO = {
  PIX: "PIX",
  PIX_SICOOB: "PIX_SICOOB",
} as const;

/** Espelha StatusEnvioBoleto + aliases do mock (PENDENTE, DUPLICADO, PRONTO, BAIXA). */
export const STATUS_ITEM_ENVIO = {
  PENDENTE_ANALISE: "PENDENTE_ANALISE",
  CLIENTE_IDENTIFICADO: "CLIENTE_IDENTIFICADO",
  AGUARDANDO_CORRECAO: "AGUARDANDO_CORRECAO",
  PRONTO_PARA_ENVIO: "PRONTO_PARA_ENVIO",
  ENVIANDO: "ENVIANDO",
  ENVIADO: "ENVIADO",
  ERRO: "ERRO",
  IGNORADO: "IGNORADO",
  CANCELADO: "CANCELADO",
  NAO_IDENTIFICADO: "NAO_IDENTIFICADO",
  PENDENTE: "PENDENTE",
  PRONTO: "PRONTO",
  BLOQUEADO: "BLOQUEADO",
  BAIXA: "BAIXA",
  DUPLICADO: "DUPLICADO",
} as const;
export type StatusItemEnvioConst = (typeof STATUS_ITEM_ENVIO)[keyof typeof STATUS_ITEM_ENVIO];

/** Espelha StatusLoteEnvioBoleto + aliases usados no histórico do front. */
export const STATUS_LOTE_ENVIO = {
  EM_ANALISE: "EM_ANALISE",
  AGUARDANDO_CONFERENCIA: "AGUARDANDO_CONFERENCIA",
  PRONTO_PARA_ENVIO: "PRONTO_PARA_ENVIO",
  PROCESSANDO: "PROCESSANDO",
  CONCLUIDO: "CONCLUIDO",
  CONCLUIDO_COM_ERROS: "CONCLUIDO_COM_ERROS",
  CANCELADO: "CANCELADO",
  RECEBIDO: "RECEBIDO",
  ANALISANDO: "ANALISANDO",
  CONFERENCIA: "CONFERENCIA",
  ENVIANDO: "ENVIANDO",
} as const;

/** Espelha LivroCaixaStatusMovimentacao. */
export const STATUS_MOVIMENTACAO = {
  PREVISTO: "PREVISTO",
  RECEBIDO: "RECEBIDO",
  PAGO: "PAGO",
  CANCELADO: "CANCELADO",
} as const;
export type StatusMovimentacaoConst =
  (typeof STATUS_MOVIMENTACAO)[keyof typeof STATUS_MOVIMENTACAO];

/** Espelha LivroCaixaTipoMovimentacao. */
export const TIPO_MOVIMENTACAO = {
  ENTRADA: "ENTRADA",
  SAIDA: "SAIDA",
} as const;

/** Espelha StatusTarefa. */
export const STATUS_TAREFA = {
  BACKLOG: "BACKLOG",
  A_FAZER: "A_FAZER",
  EM_ANDAMENTO: "EM_ANDAMENTO",
  EM_REVISAO: "EM_REVISAO",
  CONCLUIDO: "CONCLUIDO",
} as const;
export type StatusTarefaConst = (typeof STATUS_TAREFA)[keyof typeof STATUS_TAREFA];

/** Espelha StatusCobrancaSicoob. */
export const STATUS_COBRANCA_SICOOB = {
  PENDENTE: "PENDENTE",
  PAGO: "PAGO",
  CANCELADO: "CANCELADO",
  ERRO: "ERRO",
} as const;

/** Espelha StatusDocumentoCliente + alias ENVIADO (fromQuery no Java). */
export const STATUS_DOCUMENTO = {
  RECEBIDO: "RECEBIDO",
  EM_ANALISE: "EM_ANALISE",
  ARQUIVADO: "ARQUIVADO",
  ENVIADO: "ENVIADO",
} as const;

/** Espelha StatusUsuario. */
export const STATUS_USUARIO = {
  ATIVO: "ATIVO",
  INATIVO: "INATIVO",
  PENDENTE_APROVACAO: "PENDENTE_APROVACAO",
} as const;

/** Status de envio de notificação/e-mail. */
export const STATUS_ENVIO = {
  ENVIADO: "ENVIADO",
} as const;

export function statusNormalizado(valor: unknown): string {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export function statusEh(valor: unknown, ...esperados: readonly string[]): boolean {
  const n = statusNormalizado(valor);
  return esperados.some((e) => statusNormalizado(e) === n);
}
