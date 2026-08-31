export type TipoMovimentacao = "ENTRADA" | "SAIDA";

export type StatusMovimentacao = "PREVISTO" | "RECEBIDO" | "PAGO" | "CANCELADO";

export type FormaPagamento =
  | "PIX"
  | "DINHEIRO"
  | "BOLETO"
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "TRANSFERENCIA"
  | "DEBITO_AUTOMATICO"
  | "OUTRO";

export type OrigemMovimentacao =
  | "MANUAL"
  | "INADIMPLENCIA"
  | "RECORRENTE"
  | "IMPORTACAO"
  | "OUTRO";

export type LivroCaixaDashboard = {
  saldoRealizado: number;
  saldoPrevisto: number;
  entradasMes: number;
  saidasMes: number;
  resultadoMes: number;
};

export type MovimentacaoResumo = {
  id: string;
  tipo: TipoMovimentacao;
  descricao: string;
  valor: number;
  categoriaId?: string;
  categoriaNome?: string;
  formaPagamento?: FormaPagamento;
  status: StatusMovimentacao;
  dataMovimentacao: string;
  dataVencimento?: string;
  dataPagamento?: string;
  vencido: boolean;
  proximoVencimento: boolean;
  editavel: boolean;
};

export type AnexoMovimentacao = {
  id: string;
  nomeArquivo: string;
  tamanhoBytes?: number;
  contentType?: string;
  enviadoEm?: string;
};

export type HistoricoAlteracao = {
  id?: string;
  dataHora: string;
  usuario?: string;
  acao: string;
  detalhes?: string;
};

export type MovimentacaoDetalhe = MovimentacaoResumo & {
  clienteId?: string;
  clienteNome?: string;
  contaId?: string;
  contaNome?: string;
  observacao?: string;
  fornecedor?: string;
  origem?: OrigemMovimentacao;
  anexos: AnexoMovimentacao[];
  historico: HistoricoAlteracao[];
  criadoEm?: string;
  atualizadoEm?: string;
};

export type CategoriaLivroCaixa = {
  id: string;
  nome: string;
  tipo: TipoMovimentacao;
  ativa: boolean;
};

export type ContaLivroCaixa = {
  id: string;
  nome: string;
  ativa: boolean;
};

export type PaginaMovimentacoes = {
  content: MovimentacaoResumo[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type CriarMovimentacaoPayload = {
  tipo: TipoMovimentacao;
  descricao: string;
  valor: number;
  categoriaId: string;
  clienteId?: string;
  dataMovimentacao: string;
  dataVencimento?: string;
  dataPagamento?: string;
  status: StatusMovimentacao;
  formaPagamento?: FormaPagamento;
  contaId?: string;
  observacao?: string;
  fornecedor?: string;
};

export type AtualizarMovimentacaoPayload = Partial<CriarMovimentacaoPayload>;

export type ReceberPagarPayload = {
  dataPagamento: string;
  formaPagamento?: FormaPagamento;
  contaId?: string;
};

export type CriarCategoriaPayload = {
  nome: string;
  tipo: TipoMovimentacao;
};

export type AtualizarCategoriaPayload = {
  nome: string;
  tipo: TipoMovimentacao;
};

export type CriarContaPayload = {
  nome: string;
};

export type AtualizarContaPayload = {
  nome: string;
};

export type SerieMensalLivroCaixa = {
  mes: string;
  entradas: number;
  saidas: number;
};

export type DespesaPorCategoria = {
  categoriaId: string;
  categoriaNome: string;
  valor: number;
};

export type FluxoCaixaResumo = {
  saldoInicial: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoFinal: number;
};

export type AnaliseLivroCaixa = {
  entradasSaidasMensal: SerieMensalLivroCaixa[];
  despesasPorCategoria: DespesaPorCategoria[];
  fluxoCaixa: FluxoCaixaResumo;
};

export type RelatorioLivroCaixa = {
  dataInicio: string;
  dataFim: string;
  saldoInicial: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoFinal: number;
  movimentacoes: MovimentacaoResumo[];
  porCategoria?: Array<{
    categoriaNome: string;
    entradas: number;
    saidas: number;
  }>;
};

export type ListarMovimentacoesParams = {
  tipo?: TipoMovimentacao | "";
  status?: StatusMovimentacao | "";
  categoriaId?: string;
  contaId?: string;
  clienteId?: string;
  formaPagamento?: FormaPagamento | "";
  dataInicio?: string;
  dataFim?: string;
  valorMin?: number;
  valorMax?: number;
  busca?: string;
  page?: number;
  size?: number;
  sort?: string;
};
