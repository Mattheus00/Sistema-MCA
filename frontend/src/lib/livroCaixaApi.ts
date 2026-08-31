import { api, getAuthToken, getApiErrorMessage, isMockEnabled } from "@/lib/api";
import type {
  AnaliseLivroCaixa,
  AtualizarCategoriaPayload,
  AtualizarContaPayload,
  AtualizarMovimentacaoPayload,
  CategoriaLivroCaixa,
  ContaLivroCaixa,
  CriarCategoriaPayload,
  CriarContaPayload,
  CriarMovimentacaoPayload,
  FormaPagamento,
  ListarMovimentacoesParams,
  LivroCaixaDashboard,
  MovimentacaoDetalhe,
  MovimentacaoResumo,
  OrigemMovimentacao,
  PaginaMovimentacoes,
  ReceberPagarPayload,
  RelatorioLivroCaixa,
  StatusMovimentacao,
  TipoMovimentacao,
} from "@/types/livroCaixa";

const BASE = "/api/livro-caixa";

function getApiBaseUrl(): string {
  if (isMockEnabled()) return "";
  return import.meta.env.VITE_API_URL !== undefined && String(import.meta.env.VITE_API_URL).trim() !== ""
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, "")
    : "http://localhost:8080";
}

async function fetchAutenticado(path: string, init?: RequestInit): Promise<Response> {
  const baseURL = getApiBaseUrl();
  const url = baseURL ? `${baseURL}${path}` : path;
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

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

function asTipoMovimentacao(raw: unknown): TipoMovimentacao {
  const v = str(raw).toUpperCase();
  return v === "SAIDA" ? "SAIDA" : "ENTRADA";
}

function asStatusMovimentacao(raw: unknown): StatusMovimentacao {
  const v = str(raw).toUpperCase();
  if (v === "RECEBIDO" || v === "PAGO" || v === "CANCELADO" || v === "PREVISTO") return v;
  return "PREVISTO";
}

function asFormaPagamento(raw: unknown): FormaPagamento | undefined {
  if (raw == null || raw === "") return undefined;
  const v = str(raw).toUpperCase();
  const opcoes: FormaPagamento[] = [
    "PIX",
    "DINHEIRO",
    "BOLETO",
    "CARTAO_CREDITO",
    "CARTAO_DEBITO",
    "TRANSFERENCIA",
    "DEBITO_AUTOMATICO",
    "OUTRO",
  ];
  return opcoes.includes(v as FormaPagamento) ? (v as FormaPagamento) : "OUTRO";
}

function asOrigemMovimentacao(raw: unknown): OrigemMovimentacao | undefined {
  if (raw == null || raw === "") return undefined;
  const v = str(raw).toUpperCase();
  if (v === "MANUAL" || v === "INADIMPLENCIA" || v === "RECORRENTE" || v === "IMPORTACAO") return v;
  return "OUTRO";
}

export function normalizeMovimentacaoFromApi(raw: Record<string, unknown>): MovimentacaoResumo {
  const id = raw.id ?? raw.movimentacaoId;
  return {
    id: id != null ? String(id) : "",
    tipo: asTipoMovimentacao(raw.tipo),
    descricao: str(raw.descricao),
    valor: num(raw.valor),
    categoriaId: raw.categoriaId != null ? String(raw.categoriaId) : undefined,
    categoriaNome: raw.categoriaNome != null ? String(raw.categoriaNome) : raw.categoria != null ? String(raw.categoria) : undefined,
    formaPagamento: asFormaPagamento(raw.formaPagamento),
    status: asStatusMovimentacao(raw.status),
    dataMovimentacao: str(raw.dataMovimentacao),
    dataVencimento: raw.dataVencimento != null ? String(raw.dataVencimento) : undefined,
    dataPagamento: raw.dataPagamento != null ? String(raw.dataPagamento) : undefined,
    vencido: bool(raw.vencido),
    proximoVencimento: bool(raw.proximoVencimento),
    editavel: bool(raw.editavel, true),
  };
}

export function normalizeMovimentacaoDetalheFromApi(raw: Record<string, unknown>): MovimentacaoDetalhe {
  const base = normalizeMovimentacaoFromApi(raw);
  const anexosRaw = Array.isArray(raw.anexos) ? raw.anexos : [];
  const historicoRaw = Array.isArray(raw.historico) ? raw.historico : Array.isArray(raw.historicoAlteracoes) ? raw.historicoAlteracoes : [];
  return {
    ...base,
    clienteId: raw.clienteId != null ? String(raw.clienteId) : undefined,
    clienteNome: raw.clienteNome != null ? String(raw.clienteNome) : undefined,
    contaId: raw.contaId != null ? String(raw.contaId) : undefined,
    contaNome: raw.contaNome != null ? String(raw.contaNome) : undefined,
    observacao: raw.observacao != null ? String(raw.observacao) : undefined,
    fornecedor: raw.fornecedor != null ? String(raw.fornecedor) : undefined,
    origem: asOrigemMovimentacao(raw.origem),
    criadoEm: raw.criadoEm != null ? String(raw.criadoEm) : undefined,
    atualizadoEm: raw.atualizadoEm != null ? String(raw.atualizadoEm) : undefined,
    anexos: anexosRaw.map((a) => {
      const item = a as Record<string, unknown>;
      const anexoId = item.id ?? item.anexoId;
      return {
        id: anexoId != null ? String(anexoId) : "",
        nomeArquivo: str(item.nomeArquivo ?? item.nome),
        tamanhoBytes: item.tamanhoBytes != null ? num(item.tamanhoBytes) : undefined,
        contentType: item.contentType != null ? String(item.contentType) : undefined,
        enviadoEm: item.enviadoEm != null ? String(item.enviadoEm) : undefined,
      };
    }),
    historico: historicoRaw.map((h) => {
      const item = h as Record<string, unknown>;
      return {
        id: item.id != null ? String(item.id) : undefined,
        dataHora: str(item.dataHora ?? item.data),
        usuario: item.usuario != null ? String(item.usuario) : undefined,
        acao: str(item.acao ?? item.tipo),
        detalhes: item.detalhes != null ? String(item.detalhes) : item.descricao != null ? String(item.descricao) : undefined,
      };
    }),
  };
}

export function normalizePaginaMovimentacoesFromApi(raw: unknown): PaginaMovimentacoes {
  const data = (raw ?? {}) as Record<string, unknown>;
  const content = Array.isArray(data.content) ? data.content : Array.isArray(raw) ? (raw as unknown[]) : [];
  return {
    content: content.map((item) => normalizeMovimentacaoFromApi(item as Record<string, unknown>)),
    totalElements: num(data.totalElements, content.length),
    totalPages: Math.max(1, num(data.totalPages, 1)),
    number: num(data.number, 0),
    size: num(data.size, content.length || 20),
  };
}

export function normalizeDashboardFromApi(raw: unknown): LivroCaixaDashboard {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    saldoRealizado: num(data.saldoRealizado),
    saldoPrevisto: num(data.saldoPrevisto),
    entradasMes: num(data.entradasMes),
    saidasMes: num(data.saidasMes),
    resultadoMes: num(data.resultadoMes),
  };
}

export function normalizeCategoriaFromApi(raw: Record<string, unknown>): CategoriaLivroCaixa {
  const id = raw.id ?? raw.categoriaId;
  return {
    id: id != null ? String(id) : "",
    nome: str(raw.nome),
    tipo: asTipoMovimentacao(raw.tipo),
    ativa: raw.ativa != null ? bool(raw.ativa) : raw.ativo != null ? bool(raw.ativo) : true,
  };
}

export function normalizeContaFromApi(raw: Record<string, unknown>): ContaLivroCaixa {
  const id = raw.id ?? raw.contaId;
  return {
    id: id != null ? String(id) : "",
    nome: str(raw.nome),
    ativa: raw.ativa != null ? bool(raw.ativa) : raw.ativo != null ? bool(raw.ativo) : true,
  };
}

export function normalizeAnaliseFromApi(raw: unknown): AnaliseLivroCaixa {
  const data = (raw ?? {}) as Record<string, unknown>;
  const mensal = Array.isArray(data.entradasSaidasMensal) ? data.entradasSaidasMensal : [];
  const despesas = Array.isArray(data.despesasPorCategoria) ? data.despesasPorCategoria : [];
  const fluxo = (data.fluxoCaixa ?? {}) as Record<string, unknown>;
  return {
    entradasSaidasMensal: mensal.map((m) => {
      const item = m as Record<string, unknown>;
      return {
        mes: str(item.mes ?? item.periodo),
        entradas: num(item.entradas),
        saidas: num(item.saidas),
      };
    }),
    despesasPorCategoria: despesas.map((d) => {
      const item = d as Record<string, unknown>;
      return {
        categoriaId: str(item.categoriaId ?? item.id),
        categoriaNome: str(item.categoriaNome ?? item.nome),
        valor: num(item.valor),
      };
    }),
    fluxoCaixa: {
      saldoInicial: num(fluxo.saldoInicial),
      totalEntradas: num(fluxo.totalEntradas),
      totalSaidas: num(fluxo.totalSaidas),
      saldoFinal: num(fluxo.saldoFinal),
    },
  };
}

export function normalizeRelatorioFromApi(raw: unknown): RelatorioLivroCaixa {
  const data = (raw ?? {}) as Record<string, unknown>;
  const movimentacoes = Array.isArray(data.movimentacoes) ? data.movimentacoes : [];
  const porCategoria = Array.isArray(data.porCategoria) ? data.porCategoria : [];
  return {
    dataInicio: str(data.dataInicio),
    dataFim: str(data.dataFim),
    saldoInicial: num(data.saldoInicial),
    totalEntradas: num(data.totalEntradas),
    totalSaidas: num(data.totalSaidas),
    saldoFinal: num(data.saldoFinal),
    movimentacoes: movimentacoes.map((m) => normalizeMovimentacaoFromApi(m as Record<string, unknown>)),
    porCategoria: porCategoria.length
      ? porCategoria.map((c) => {
          const item = c as Record<string, unknown>;
          return {
            categoriaNome: str(item.categoriaNome ?? item.nome),
            entradas: num(item.entradas),
            saidas: num(item.saidas),
          };
        })
      : undefined,
  };
}

function buildMovimentacoesQuery(params: ListarMovimentacoesParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page ?? 0,
    size: params.size ?? 20,
  };
  if (params.tipo) query.tipo = params.tipo;
  if (params.status) query.status = params.status;
  if (params.categoriaId?.trim()) query.categoriaId = params.categoriaId.trim();
  if (params.contaId?.trim()) query.contaId = params.contaId.trim();
  if (params.clienteId?.trim()) query.clienteId = params.clienteId.trim();
  if (params.formaPagamento) query.formaPagamento = params.formaPagamento;
  if (params.dataInicio?.trim()) query.dataInicio = params.dataInicio.trim();
  if (params.dataFim?.trim()) query.dataFim = params.dataFim.trim();
  if (params.valorMin != null) query.valorMin = params.valorMin;
  if (params.valorMax != null) query.valorMax = params.valorMax;
  if (params.busca?.trim()) query.busca = params.busca.trim();
  if (params.sort?.trim()) query.sort = params.sort.trim();
  return query;
}

export async function obterDashboardLivroCaixa(): Promise<LivroCaixaDashboard> {
  try {
    const r = await api.get(`${BASE}/dashboard`);
    return normalizeDashboardFromApi(r.data);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar o dashboard do Livro Caixa."));
  }
}

export async function listarMovimentacoes(params: ListarMovimentacoesParams = {}): Promise<PaginaMovimentacoes> {
  try {
    const r = await api.get(`${BASE}/movimentacoes`, { params: buildMovimentacoesQuery(params) });
    return normalizePaginaMovimentacoesFromApi(r.data);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar as movimentações."));
  }
}

export async function obterMovimentacao(id: string): Promise<MovimentacaoDetalhe> {
  try {
    const r = await api.get(`${BASE}/movimentacoes/${id}`);
    return normalizeMovimentacaoDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar a movimentação."));
  }
}

export async function criarMovimentacao(payload: CriarMovimentacaoPayload): Promise<MovimentacaoDetalhe> {
  try {
    const r = await api.post(`${BASE}/movimentacoes`, payload);
    return normalizeMovimentacaoDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível criar a movimentação."));
  }
}

export async function atualizarMovimentacao(id: string, payload: AtualizarMovimentacaoPayload): Promise<MovimentacaoDetalhe> {
  try {
    const r = await api.put(`${BASE}/movimentacoes/${id}`, payload);
    return normalizeMovimentacaoDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível atualizar a movimentação."));
  }
}

export async function receberMovimentacao(id: string, payload: ReceberPagarPayload): Promise<MovimentacaoDetalhe> {
  try {
    const r = await api.patch(`${BASE}/movimentacoes/${id}/receber`, payload);
    return normalizeMovimentacaoDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível registrar o recebimento."));
  }
}

export async function pagarMovimentacao(id: string, payload: ReceberPagarPayload): Promise<MovimentacaoDetalhe> {
  try {
    const r = await api.patch(`${BASE}/movimentacoes/${id}/pagar`, payload);
    return normalizeMovimentacaoDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível registrar o pagamento."));
  }
}

export async function cancelarMovimentacao(id: string): Promise<MovimentacaoDetalhe> {
  try {
    const r = await api.patch(`${BASE}/movimentacoes/${id}/cancelar`);
    return normalizeMovimentacaoDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível cancelar a movimentação."));
  }
}

export async function listarCategorias(apenasAtivas = true): Promise<CategoriaLivroCaixa[]> {
  try {
    const r = await api.get(`${BASE}/categorias`, { params: apenasAtivas ? { ativas: true } : {} });
    const list = Array.isArray(r.data) ? r.data : Array.isArray((r.data as Record<string, unknown>)?.content) ? (r.data as Record<string, unknown>).content as unknown[] : [];
    return list.map((item) => normalizeCategoriaFromApi(item as Record<string, unknown>));
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar as categorias."));
  }
}

export async function criarCategoria(payload: CriarCategoriaPayload): Promise<CategoriaLivroCaixa> {
  try {
    const r = await api.post(`${BASE}/categorias`, payload);
    return normalizeCategoriaFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível criar a categoria."));
  }
}

export async function atualizarCategoria(id: string, payload: AtualizarCategoriaPayload): Promise<CategoriaLivroCaixa> {
  try {
    const r = await api.put(`${BASE}/categorias/${id}`, payload);
    return normalizeCategoriaFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível atualizar a categoria."));
  }
}

export async function desativarCategoria(id: string): Promise<void> {
  try {
    await api.patch(`${BASE}/categorias/${id}/desativar`);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível desativar a categoria."));
  }
}

export async function listarContas(apenasAtivas = true): Promise<ContaLivroCaixa[]> {
  try {
    const r = await api.get(`${BASE}/contas`, { params: apenasAtivas ? { ativas: true } : {} });
    const list = Array.isArray(r.data) ? r.data : Array.isArray((r.data as Record<string, unknown>)?.content) ? (r.data as Record<string, unknown>).content as unknown[] : [];
    return list.map((item) => normalizeContaFromApi(item as Record<string, unknown>));
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar as contas."));
  }
}

export async function criarConta(payload: CriarContaPayload): Promise<ContaLivroCaixa> {
  try {
    const r = await api.post(`${BASE}/contas`, payload);
    return normalizeContaFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível criar a conta."));
  }
}

export async function atualizarConta(id: string, payload: AtualizarContaPayload): Promise<ContaLivroCaixa> {
  try {
    const r = await api.put(`${BASE}/contas/${id}`, payload);
    return normalizeContaFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível atualizar a conta."));
  }
}

export async function desativarConta(id: string): Promise<void> {
  try {
    await api.patch(`${BASE}/contas/${id}/desativar`);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível desativar a conta."));
  }
}

export async function obterAnaliseLivroCaixa(dataInicio: string, dataFim: string): Promise<AnaliseLivroCaixa> {
  try {
    const r = await api.get(`${BASE}/analise`, { params: { dataInicio, dataFim } });
    return normalizeAnaliseFromApi(r.data);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar a análise."));
  }
}

export async function obterRelatorioLivroCaixa(dataInicio: string, dataFim: string): Promise<RelatorioLivroCaixa> {
  try {
    const r = await api.get(`${BASE}/relatorio`, { params: { dataInicio, dataFim } });
    return normalizeRelatorioFromApi(r.data);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível carregar o relatório."));
  }
}

export async function enviarAnexoMovimentacao(movimentacaoId: string, arquivo: File): Promise<MovimentacaoDetalhe> {
  try {
    const form = new FormData();
    form.append("arquivo", arquivo);
    const r = await api.post(`${BASE}/movimentacoes/${movimentacaoId}/anexos`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return normalizeMovimentacaoDetalheFromApi(r.data as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Não foi possível enviar o anexo."));
  }
}

export async function baixarAnexoMovimentacao(movimentacaoId: string, anexoId: string, nomeArquivo?: string): Promise<void> {
  const path = `${BASE}/movimentacoes/${movimentacaoId}/anexos/${anexoId}`;
  let blob: Blob;
  if (isMockEnabled()) {
    const r = await api.get(path, { responseType: "blob" });
    blob = r.data as Blob;
  } else {
    const res = await fetchAutenticado(path);
    if (!res.ok) throw new Error("Não foi possível baixar o anexo.");
    blob = await res.blob();
  }
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = nomeArquivo ?? `anexo-${anexoId}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

export const LIVRO_CAIXA_INVALIDATE_EVENT = "livro-caixa-invalidate";

export function invalidateLivroCaixa(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LIVRO_CAIXA_INVALIDATE_EVENT));
  }
}
