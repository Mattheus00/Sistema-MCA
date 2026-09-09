/**
 * Normaliza respostas e payloads entre backend (API real) e tipos do frontend.
 *
 * Cada normalizer documenta qual DTO Java (backend/src/main/java/com/pucminas/sgi/dto/response)
 * ele espelha. Só são lidos os nomes de campo que o backend realmente devolve; quando o mock
 * em memória (`mockApi.ts`) ainda usa outro nome, o alias é mantido e marcado como "mock".
 */

import { formatarMesAno } from "@/lib/inadimplentesUtils";
import type {
  Cliente,
  Inadimplencia,
  PagamentoInadimplencia,
  PagamentoRecebidoItem,
  PagamentosRecebidosRelatorio,
  RankingDevedorItem,
  InadimplenciaPeriodoRelatorio,
  ResumoFinanceiro,
  ResumoRelatorio,
  ItemEnvioBoleto,
  LoteEnvioBoleto,
  LoteEnvioBoletoResumo,
  PaginaLotesEnvioBoleto,
  ResultadoEnvioItem,
  ResultadoEnvioLote,
  ResumoLoteEnvioBoleto,
  ValidacaoLoteEnvioBoleto,
  ConfiancaIdentificacaoBoleto,
  StatusItemEnvioBoleto,
  DocumentoCliente,
  ResumoDocumentosClientes,
  PaginaDocumentosClientes,
  PortalDocumento,
  StatusDocumentoCliente,
  TipoDocumentoCliente,
} from "@/types/api";

/** Prefixo gravado em `comprovante` para persistir quem confirmou (PagamentoResponseDTO não tem esse campo). */
export const CONFIRMADO_POR_COMPROVANTE_PREFIX = "user:";

export function encodeConfirmadoPorComprovante(label: string): string {
  return `${CONFIRMADO_POR_COMPROVANTE_PREFIX}${label.trim()}`;
}

export function decodeConfirmadoPorComprovante(
  comprovante: string | null | undefined,
): string | undefined {
  if (!comprovante) return undefined;
  const s = comprovante.trim();
  if (!s.toLowerCase().startsWith(CONFIRMADO_POR_COMPROVANTE_PREFIX)) return undefined;
  const nome = s.slice(CONFIRMADO_POR_COMPROVANTE_PREFIX.length).trim();
  return nome || undefined;
}

const str = (v: unknown): string | undefined => (v != null ? String(v) : undefined);
const num = (v: unknown): number | undefined => (v != null ? Number(v) : undefined);
/** Number() seguro: retorna 0 para null/undefined/NaN. */
const numOr0 = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Espelha ClienteResponseDTO (clienteId, cpfCnpj, statusCliente, saldoDevedor, criadoEm/atualizadoEm). Mock: id, cpf, situacao, saldoDevedorTotal, createdAt/updatedAt. */
export function normalizeClienteFromApi(raw: Record<string, unknown>): Cliente {
  const id = raw.id ?? raw.clienteId;
  const situacao = raw.situacao ?? mapStatusClienteToSituacao(String(raw.statusCliente ?? ""));
  return {
    id: str(id),
    codigo: str(raw.codigo),
    nome: String(raw.nome ?? ""),
    email: str(raw.email),
    cpf: str(raw.cpf ?? raw.cpfCnpj),
    telefone: str(raw.telefone),
    celular: str(raw.celular),
    endereco: str(raw.endereco),
    situacao: situacao as Cliente["situacao"],
    saldoDevedorTotal: num(raw.saldoDevedorTotal ?? raw.saldoDevedor),
    createdAt: str(raw.createdAt ?? raw.criadoEm),
    updatedAt: str(raw.updatedAt ?? raw.atualizadoEm),
  };
}

function mapStatusClienteToSituacao(status: string): string {
  const u = status.toUpperCase();
  if (u === "ATIVO") return "Ativo";
  if (u === "INADIMPLENTE") return "Inadimplente";
  if (u === "INATIVO") return "Inativo";
  return status || "Ativo";
}

/** Payload para backend (ClienteDTO): statusCliente em maiúsculas, cpfCnpj (backend aceita cpf como alias) */
export function normalizeClienteToApi(c: Partial<Cliente>): Record<string, unknown> {
  const situacao = c.situacao ?? "Ativo";
  const statusCliente =
    situacao === "Ativo" ? "ATIVO" : situacao === "Inadimplente" ? "INADIMPLENTE" : "INATIVO";
  const cpfRaw = c.cpf?.trim();
  const cpfDigits = cpfRaw?.replace(/\D/g, "") ?? "";
  const cpfCnpj =
    cpfRaw && /[a-zA-Z]/.test(cpfRaw) ? cpfRaw.replace(/\s/g, "") : cpfDigits || undefined;
  const payload: Record<string, unknown> = {
    nome: c.nome,
    email: c.email,
    cpfCnpj,
    telefone: c.telefone?.replace(/\D/g, "") || undefined,
    celular: c.celular?.replace(/\D/g, "") || undefined,
    endereco: c.endereco,
    statusCliente,
  };
  if (c.codigo?.trim()) payload.codigo = c.codigo.trim().toUpperCase();
  if (c.id != null) payload.id = c.id;
  return payload;
}

/** Backend retorna valores monetários em reais (ex.: 1000 = R$ 1.000,00). Não multiplicar/dividir por 100. */
const VALOR_CENTAVOS = false;
const conv = (v: number) => (VALOR_CENTAVOS ? v / 100 : v);

/**
 * Usuário que confirmou o pagamento: `confirmadoPor` (mock) ou, no backend, o prefixo
 * `user:` gravado em `comprovante` (PagamentoResponseDTO não possui campo dedicado).
 */
function extrairConfirmadoPor(raw: Record<string, unknown>): string | undefined {
  const direto = raw.confirmadoPor;
  if (direto != null && String(direto).trim()) return String(direto).trim();
  return decodeConfirmadoPorComprovante(str(raw.comprovante));
}

/** Espelha PagamentoResponseDTO (pagamentoId, dividaId, protocoloDivida, valorPago em reais, dataPagamento, metodoPagamento, comprovante, criadoEm). */
export function normalizePagamentoInadimplenciaFromApi(
  raw: Record<string, unknown>,
): PagamentoInadimplencia {
  return {
    pagamentoId: str(raw.pagamentoId),
    dividaId: str(raw.dividaId),
    protocoloDivida: str(raw.protocoloDivida),
    valorPago: numOr0(raw.valorPago),
    dataPagamento: String(raw.dataPagamento ?? ""),
    metodoPagamento: str(raw.metodoPagamento),
    comprovante: str(raw.comprovante),
    criadoEm: str(raw.criadoEm),
    confirmadoPor: extrairConfirmadoPor(raw),
  };
}

/** InadimplenciaService devolve "Pago" | "Acordo" | "EmAberto"; mock pode usar "PARCIAL". */
function normalizeStatusInadimplenciaFromApi(raw: unknown): Inadimplencia["status"] {
  const s = String(raw ?? "EmAberto")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (s === "PAGO" || s === "QUITADA" || s === "QUITADO") return "Pago";
  if (s === "PARCIAL") return "PARCIAL";
  if (s === "ACORDO") return "Acordo";
  return "EmAberto";
}

/** Espelha InadimplenciaResponseDTO (id, clienteId, clienteNome, valorOriginal, juros, valor, vencimento, descricao, status, createdAt, updatedAt, pagamentos[]). Mock: + valorDevedor. */
export function normalizeInadimplenciaFromApi(raw: Record<string, unknown>): Inadimplencia {
  const valorOriginal = num(raw.valorOriginal);
  const juros = num(raw.juros);
  const valorDevedor = num(raw.valorDevedor);
  const pagamentosRaw = raw.pagamentos;
  let pagamentos: PagamentoInadimplencia[] | undefined;
  if (Array.isArray(pagamentosRaw)) {
    pagamentos = pagamentosRaw
      .filter((p): p is Record<string, unknown> => p != null && typeof p === "object")
      .map((p) => normalizePagamentoInadimplenciaFromApi(p));
  }
  return {
    id: str(raw.id),
    clienteId: raw.clienteId != null ? String(raw.clienteId) : "",
    clienteNome: str(raw.clienteNome),
    valor: conv(numOr0(raw.valor)),
    valorOriginal: valorOriginal != null ? conv(valorOriginal) : undefined,
    juros: juros != null ? conv(juros) : undefined,
    valorDevedor: valorDevedor != null ? conv(valorDevedor) : undefined,
    vencimento: String(raw.vencimento ?? "").trim(),
    descricao: str(raw.descricao),
    status: normalizeStatusInadimplenciaFromApi(raw.status),
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
    pagamentos,
  };
}

/** Payload para POST inadimplentes (InadimplenciaPayloadDTO): valor em reais */
export function normalizeInadimplenciaToApi(p: {
  clienteId: string;
  valor: number;
  vencimento: string;
  descricao?: string;
}): Record<string, unknown> {
  return {
    clienteId: p.clienteId,
    valor: VALOR_CENTAVOS ? Math.round(p.valor * 100) : p.valor,
    vencimento: p.vencimento,
    descricao: p.descricao,
  };
}

/**
 * Espelha RankingDevedoresDTO { limite, ranking: ItemRankingDTO[] } com
 * ItemRankingDTO (clienteId, nomeCliente, cpfCnpj, saldoDevedor, posicao).
 * O DTO não traz qtdDividas/mediaDiasAtraso/status — ficam nos valores padrão.
 */
export function normalizeRankingFromApi(data: unknown): RankingDevedorItem[] {
  if (!data || typeof data !== "object" || !("ranking" in data)) return [];
  const arr = (data as { ranking?: unknown[] }).ranking;
  if (!Array.isArray(arr)) return [];
  return arr.map((item, i: number) => {
    const r = item as Record<string, unknown>;
    return {
      posicao: Number(r.posicao ?? i + 1),
      clienteId: r.clienteId != null ? String(r.clienteId) : "",
      clienteNome: String(r.nomeCliente ?? ""),
      cpfCnpj: String(r.cpfCnpj ?? ""),
      valorDevido: numOr0(r.saldoDevedor),
      qtdDividas: 0,
      mediaDiasAtraso: 0,
      status: "Recente",
    };
  });
}

/**
 * Espelha RelatorioInadimplentesDTO (periodoInicio, periodoFim, totalClientesInadimplentes,
 * valorTotalInadimplente, itens: ItemInadimplenteDTO[] { nomeCliente, cpfCnpj, quantidadeDividas,
 * saldoDevedor, dataVencimentoMaisAntiga }). O DTO não traz clienteId/statusPior nem o valor
 * vencido no período (mantido 0 — pendência de backend).
 */
export function normalizeInadimplenciaPeriodoFromApi(
  data: unknown,
): InadimplenciaPeriodoRelatorio | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const arr = Array.isArray(d.itens) ? (d.itens as Record<string, unknown>[]) : [];
  const detalhamento = arr.map((x) => ({
    clienteId: "",
    clienteNome: String(x.nomeCliente ?? ""),
    cpfCnpj: String(x.cpfCnpj ?? ""),
    qtdDividas: numOr0(x.quantidadeDividas),
    valorTotal: numOr0(x.saldoDevedor),
    statusPior: "EM_ABERTO" as const,
  }));
  return {
    dataInicio: String(d.periodoInicio ?? ""),
    dataFim: String(d.periodoFim ?? ""),
    totalClientes: numOr0(d.totalClientesInadimplentes),
    valorTotal: numOr0(d.valorTotalInadimplente),
    dividasVencidasNoPeriodo: arr.length,
    valorVencidoNoPeriodo: 0,
    detalhamento,
  };
}

/** Espelha ResumoFinanceiroDTO (periodoInicio, periodoFim, totalRecebido, totalEmAberto). */
export function normalizeResumoFinanceiroFromApi(data: unknown): ResumoFinanceiro | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  return {
    totalEmAberto: conv(numOr0(d.totalEmAberto)),
    totalRecebido: conv(numOr0(d.totalRecebido)),
    periodoInicio: str(d.periodoInicio),
    periodoFim: str(d.periodoFim),
  };
}

/** Espelha ResumoRelatorioDTO (totalClientes, totalDividas, totalEmAberto, totalPago) — GET /api/relatorios/resumo. */
export function normalizeResumoRelatorioFromApi(data: unknown): ResumoRelatorio | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  return {
    totalClientes: numOr0(d.totalClientes),
    totalDividas: numOr0(d.totalDividas),
    totalEmAberto: conv(numOr0(d.totalEmAberto)),
    totalPago: conv(numOr0(d.totalPago)),
  };
}

function mesFromProtocolo(protocolo: string): string | undefined {
  const m = protocolo.match(/DIV-(\d{4})(\d{2})\d{2}/i);
  if (!m) return undefined;
  return `${m[2]}/${m[1]}`;
}

/** Mês de referência para exibição (Cliente / Mês / Valor). */
export function mesReferenciaPagamentoRecebido(item: PagamentoRecebidoItem): string {
  if (item.mesReferencia?.trim()) return item.mesReferencia.trim();
  if (item.vencimento) return formatarMesAno(item.vencimento);
  const fromProto = mesFromProtocolo(item.protocolo);
  if (fromProto) return fromProto;
  if (item.data) return formatarMesAno(item.data);
  return "—";
}

/**
 * Sem DTO no backend: `GET /api/relatorios/pagamentos-recebidos` não existe (pendência de backend).
 * Espelha o formato do mock (PagamentoRecebidoItem): data, clienteNome, protocolo, valor, metodo,
 * saldoRestante, mesReferencia, vencimento, confirmadoPor.
 */
export function normalizePagamentoRecebidoItemFromApi(
  raw: Record<string, unknown>,
): PagamentoRecebidoItem {
  return {
    data: String(raw.data ?? ""),
    clienteNome: String(raw.clienteNome ?? "—"),
    protocolo: String(raw.protocolo ?? ""),
    valor: conv(numOr0(raw.valor)),
    metodo: String(raw.metodo ?? "—"),
    saldoRestante: conv(numOr0(raw.saldoRestante)),
    mesReferencia: str(raw.mesReferencia),
    vencimento: str(raw.vencimento),
    confirmadoPor: extrairConfirmadoPor(raw),
  };
}

/** Sem DTO no backend (ver normalizePagamentoRecebidoItemFromApi); espelha PagamentosRecebidosRelatorio do mock. */
export function normalizePagamentosRecebidosFromApi(
  data: unknown,
): PagamentosRecebidosRelatorio | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const listaRaw = Array.isArray(d.detalhamento)
    ? (d.detalhamento as Record<string, unknown>[])
    : [];
  const detalhamento = listaRaw.map(normalizePagamentoRecebidoItemFromApi);
  const valorTotalBruto = Number(d.valorTotal ?? 0);
  return {
    dataInicio: String(d.dataInicio ?? ""),
    dataFim: String(d.dataFim ?? ""),
    totalPagamentos: Number(d.totalPagamentos ?? detalhamento.length),
    valorTotal: Number.isFinite(valorTotalBruto)
      ? conv(valorTotalBruto)
      : detalhamento.reduce((s, i) => s + i.valor, 0),
    porMetodo: Array.isArray(d.porMetodo)
      ? (d.porMetodo as Record<string, unknown>[]).map((m) => ({
          metodo: String(m.metodo ?? ""),
          valor: conv(numOr0(m.valor)),
          percentual: numOr0(m.percentual),
        }))
      : [],
    detalhamento,
  };
}

function normalizeConfianca(raw: unknown): ConfiancaIdentificacaoBoleto | undefined {
  const v = String(raw ?? "").toUpperCase();
  if (v === "ALTA" || v === "MEDIA" || v === "BAIXA") return v;
  return undefined;
}

function normalizeStatusItem(raw: unknown): StatusItemEnvioBoleto {
  const v = String(raw ?? "PENDENTE").toUpperCase();
  const conhecidos: StatusItemEnvioBoleto[] = [
    "AGUARDANDO_CORRECAO",
    "PRONTO_PARA_ENVIO",
    "ENVIADO",
    "IGNORADO",
    "ERRO",
    "NAO_IDENTIFICADO",
    "PENDENTE",
    "PRONTO",
    "BLOQUEADO",
    "BAIXA",
    "DUPLICADO",
  ];
  if (conhecidos.includes(v as StatusItemEnvioBoleto)) return v as StatusItemEnvioBoleto;
  return "PENDENTE";
}

/**
 * Espelha ItemEnvioBoletoResponse (envioBoletoId, clienteId, clienteNome, documentoMascarado,
 * nomeArquivoOriginal, emailDestinatario, metodoIdentificacao, confiancaIdentificacao, status,
 * tamanhoArquivo, simulado, mensagemErro). Mock: itemId, tamanhoBytes, bloqueado, motivoBloqueio, erro.
 */
export function normalizeItemEnvioBoletoFromApi(raw: Record<string, unknown>): ItemEnvioBoleto {
  const envioBoletoId = String(raw.envioBoletoId ?? raw.itemId ?? "");
  return {
    envioBoletoId,
    itemId: envioBoletoId,
    nomeArquivoOriginal: String(raw.nomeArquivoOriginal ?? ""),
    tamanhoBytes: num(raw.tamanhoBytes ?? raw.tamanhoArquivo),
    clienteId: str(raw.clienteId),
    clienteNome: str(raw.clienteNome),
    documentoMascarado: str(raw.documentoMascarado),
    emailDestinatario: str(raw.emailDestinatario),
    metodoIdentificacao: str(raw.metodoIdentificacao),
    confiancaIdentificacao: normalizeConfianca(raw.confiancaIdentificacao),
    status: normalizeStatusItem(raw.status),
    bloqueado: raw.bloqueado === true,
    motivoBloqueio: str(raw.motivoBloqueio),
    erro: str(raw.erro ?? raw.mensagemErro),
    simulado: raw.simulado === true,
  };
}

function buildResumoFromItens(itens: ItemEnvioBoleto[]): ResumoLoteEnvioBoleto {
  const statusApi = (i: ItemEnvioBoleto) => String(i.status ?? "").toUpperCase();
  return {
    semEmail: itens.filter(
      (i) => !i.emailDestinatario?.trim() && statusApi(i) === "AGUARDANDO_CORRECAO",
    ).length,
    prontosParaEnvio: itens.filter((i) => statusApi(i) === "PRONTO_PARA_ENVIO").length,
    ignorados: itens.filter((i) => String(i.status).toUpperCase() === "IGNORADO").length,
    enviados: itens.filter((i) => String(i.status).toUpperCase() === "ENVIADO").length,
    erros: itens.filter((i) => String(i.status).toUpperCase() === "ERRO").length,
    duplicados: itens.filter((i) => String(i.status).toUpperCase() === "DUPLICADO").length,
    bloqueados: itens.filter((i) => i.bloqueado || String(i.status).toUpperCase() === "BLOQUEADO")
      .length,
    aguardandoCorrecao: itens.filter(
      (i) => String(i.status).toUpperCase() === "AGUARDANDO_CORRECAO",
    ).length,
    naoIdentificados: itens.filter(
      (i) =>
        String(i.status).toUpperCase() === "NAO_IDENTIFICADO" ||
        String(i.metodoIdentificacao ?? "").toUpperCase() === "NAO_IDENTIFICADO" ||
        !i.clienteNome?.trim(),
    ).length,
  };
}

/** Espelha ResumoLoteEnvioResponse (semEmail, prontosParaEnvio, ignorados, enviados, erros, duplicados, bloqueados, aguardandoCorrecao). */
function normalizeResumoLoteFromApi(
  raw: Record<string, unknown> | undefined,
  itens: ItemEnvioBoleto[],
): ResumoLoteEnvioBoleto {
  if (!raw) return buildResumoFromItens(itens);
  return {
    semEmail: numOr0(raw.semEmail),
    prontosParaEnvio: numOr0(raw.prontosParaEnvio),
    ignorados: numOr0(raw.ignorados),
    enviados: numOr0(raw.enviados),
    erros: numOr0(raw.erros),
    duplicados: numOr0(raw.duplicados),
    bloqueados: numOr0(raw.bloqueados),
    aguardandoCorrecao: numOr0(raw.aguardandoCorrecao),
    naoIdentificados: 0,
  };
}

/** Espelha ValidacaoLoteResponse (podeEnviar). Mock: bloqueios[{ itemId, motivo }]. */
export function normalizeValidacaoLoteFromApi(
  raw: Record<string, unknown> | undefined,
): ValidacaoLoteEnvioBoleto | undefined {
  if (!raw) return undefined;
  const bloqueiosRaw = Array.isArray(raw.bloqueios)
    ? (raw.bloqueios as Record<string, unknown>[])
    : [];
  const podeEnviarRaw = raw.podeEnviar;
  if (podeEnviarRaw === undefined && bloqueiosRaw.length === 0) return undefined;
  return {
    podeEnviar: podeEnviarRaw === true,
    bloqueios: bloqueiosRaw.map((b) => ({
      itemId: String(b.itemId ?? b.envioBoletoId ?? ""),
      motivo: String(b.motivo ?? ""),
    })),
  };
}

/**
 * Espelha LoteEnvioBoletoResponse (loteId, status, usuarioResponsavelNome, quantidadeTotal,
 * quantidadeIdentificada, quantidadePendente, criadoEm, dataFinalizacao, itens, resumo) e também
 * ValidacaoLoteResponse (loteId, podeEnviar, resumo, itens) e EnviarLoteResponse (statusLote,
 * resultados, enviados/erros/ignorados). Mock: enviadoEm, criadoPor.
 */
export function normalizeLoteEnvioBoletoFromApi(raw: Record<string, unknown>): LoteEnvioBoleto {
  let itensRaw = Array.isArray(raw.itens) ? (raw.itens as Record<string, unknown>[]) : [];
  if (itensRaw.length === 0 && Array.isArray(raw.resultados)) {
    itensRaw = raw.resultados as Record<string, unknown>[];
  }
  const itens = itensRaw.map(normalizeItemEnvioBoletoFromApi);
  const resumoEmbutido =
    raw.resumo && typeof raw.resumo === "object"
      ? (raw.resumo as Record<string, unknown>)
      : undefined;
  const resumoRaw =
    resumoEmbutido ??
    (raw.enviados != null || raw.erros != null || raw.ignorados != null
      ? {
          enviados: raw.enviados,
          erros: raw.erros,
          ignorados: raw.ignorados,
        }
      : undefined);
  return {
    loteId: String(raw.loteId ?? ""),
    status: String(raw.status ?? raw.statusLote ?? "CONFERENCIA"),
    criadoEm: str(raw.criadoEm),
    enviadoEm: str(raw.enviadoEm ?? raw.dataFinalizacao),
    criadoPor: str(raw.criadoPor ?? raw.usuarioResponsavelNome),
    quantidadeTotal: raw.quantidadeTotal != null ? Number(raw.quantidadeTotal) : itens.length,
    quantidadeIdentificada:
      raw.quantidadeIdentificada != null
        ? Number(raw.quantidadeIdentificada)
        : itens.filter((i) => i.clienteNome?.trim()).length,
    quantidadePendente:
      raw.quantidadePendente != null
        ? Number(raw.quantidadePendente)
        : itens.filter((i) => {
            const s = String(i.status).toUpperCase();
            return s === "AGUARDANDO_CORRECAO" || s === "PENDENTE" || s === "NAO_IDENTIFICADO";
          }).length,
    resumo: normalizeResumoLoteFromApi(resumoRaw, itens),
    itens,
    validacao: normalizeValidacaoLoteFromApi(raw),
  };
}

/** Espelha HistoricoLoteResponse (loteId, status, usuarioResponsavelNome, quantidadeTotal, quantidadeEnviada, quantidadeComErro, totalItens, enviados, erros, criadoPor, criadoEm, dataFinalizacao). Mock: enviadoEm. */
export function normalizeLoteResumoFromApi(raw: Record<string, unknown>): LoteEnvioBoletoResumo {
  return {
    loteId: String(raw.loteId ?? ""),
    status: String(raw.status ?? ""),
    criadoEm: str(raw.criadoEm),
    enviadoEm: str(raw.dataFinalizacao ?? raw.enviadoEm),
    criadoPor: str(raw.criadoPor ?? raw.usuarioResponsavelNome),
    totalItens: num(raw.totalItens ?? raw.quantidadeTotal),
    enviados: num(raw.enviados ?? raw.quantidadeEnviada),
    erros: num(raw.erros ?? raw.quantidadeComErro),
  };
}

/** Espelha ResultadoEnvioItemResponse (envioBoletoId, clienteId, clienteNome, emailDestinatario, nomeArquivoOriginal, status, simulado, reenvio, mensagemErro, dataEnvio). */
function normalizeResultadoEnvioItemFromApi(raw: Record<string, unknown>): ResultadoEnvioItem {
  return {
    envioBoletoId: String(raw.envioBoletoId ?? ""),
    clienteId: str(raw.clienteId),
    clienteNome: str(raw.clienteNome),
    emailDestinatario: str(raw.emailDestinatario),
    nomeArquivoOriginal: str(raw.nomeArquivoOriginal),
    status: str(raw.status),
    simulado: Boolean(raw.simulado),
    reenvio: Boolean(raw.reenvio),
    mensagemErro: raw.mensagemErro != null ? String(raw.mensagemErro) : null,
    dataEnvio: str(raw.dataEnvio),
  };
}

/** Espelha ResultadoEnvioLoteResponse (loteId, status, criadoEm, dataFinalizacao, quantidade*, enviados[], comErro[], naoEnviados[]). */
export function normalizeResultadoEnvioLoteFromApi(
  raw: Record<string, unknown>,
): ResultadoEnvioLote {
  const mapLista = (lista: unknown): ResultadoEnvioItem[] =>
    Array.isArray(lista)
      ? (lista as Record<string, unknown>[]).map(normalizeResultadoEnvioItemFromApi)
      : [];

  return {
    loteId: String(raw.loteId ?? ""),
    status: str(raw.status),
    criadoEm: str(raw.criadoEm),
    dataFinalizacao: str(raw.dataFinalizacao),
    quantidadeTotal: num(raw.quantidadeTotal),
    quantidadeEnviada: num(raw.quantidadeEnviada),
    quantidadeComErro: num(raw.quantidadeComErro),
    quantidadeNaoEnviada: num(raw.quantidadeNaoEnviada),
    enviados: mapLista(raw.enviados),
    comErro: mapLista(raw.comErro),
    naoEnviados: mapLista(raw.naoEnviados),
  };
}

/** Page<HistoricoLoteResponse> do Spring (ou array direto no mock). */
export function normalizePaginaLotesEnvioFromApi(data: unknown): PaginaLotesEnvioBoleto {
  if (data && typeof data === "object" && "content" in data) {
    const body = data as Record<string, unknown>;
    const content = Array.isArray(body.content)
      ? (body.content as Record<string, unknown>[]).map(normalizeLoteResumoFromApi)
      : [];
    return {
      content,
      totalElements: Number(body.totalElements ?? content.length),
      totalPages: Number(body.totalPages ?? 1),
      number: Number(body.number ?? 0),
      size: Number(body.size ?? content.length),
    };
  }
  const list = Array.isArray(data)
    ? (data as Record<string, unknown>[]).map(normalizeLoteResumoFromApi)
    : [];
  return {
    content: list,
    totalElements: list.length,
    totalPages: 1,
    number: 0,
    size: list.length,
  };
}

function normalizeStatusDocumentoCliente(raw: unknown): StatusDocumentoCliente {
  const s = String(raw ?? "RECEBIDO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (s === "ENVIADO" || s.includes("ENVIAD")) return "ENVIADO";
  if (s === "EM_ANALISE" || s.includes("ANALISE")) return "EM_ANALISE";
  if (s === "ARQUIVADO" || s.includes("ARQUIVAD")) return "ARQUIVADO";
  return "RECEBIDO";
}

function normalizeTipoDocumentoCliente(raw: unknown): TipoDocumentoCliente {
  const t = String(raw ?? "OUTRO").toUpperCase();
  const validos: TipoDocumentoCliente[] = [
    "COMPROVANTE",
    "NOTA_FISCAL",
    "CONTRATO",
    "DECLARACAO",
    "OUTRO",
  ];
  return validos.includes(t as TipoDocumentoCliente) ? (t as TipoDocumentoCliente) : "OUTRO";
}

/** Espelha PortalDocumentoDTO (documentoId, clienteId, clienteNome, clienteCodigo, dividaId, protocoloDivida, tipo, status, nomeOriginal, contentType, tamanhoBytes, observacaoCliente, respostaEscritorio, respondidoEm, respondidoPorNome, enviadoEm) — visão staff. */
export function normalizeDocumentoClienteFromApi(raw: Record<string, unknown>): DocumentoCliente {
  return {
    documentoId: String(raw.documentoId ?? ""),
    clienteId: str(raw.clienteId),
    clienteNome: str(raw.clienteNome),
    clienteCodigo: str(raw.clienteCodigo),
    dividaId: str(raw.dividaId),
    protocoloDivida: str(raw.protocoloDivida),
    tipo: normalizeTipoDocumentoCliente(raw.tipo),
    status: normalizeStatusDocumentoCliente(raw.status),
    nomeOriginal: String(raw.nomeOriginal ?? "arquivo"),
    contentType: String(raw.contentType ?? "application/octet-stream"),
    tamanhoBytes: numOr0(raw.tamanhoBytes),
    observacaoCliente: str(raw.observacaoCliente),
    respostaEscritorio: str(raw.respostaEscritorio),
    respondidoEm: str(raw.respondidoEm),
    respondidoPorNome: str(raw.respondidoPorNome),
    enviadoEm: String(raw.enviadoEm ?? new Date().toISOString()),
  };
}

/** Espelha ResumoDocumentosClientesDTO (recebidos, pendentes, novos, emAnalise, arquivados). */
export function normalizeResumoDocumentosClientesFromApi(data: unknown): ResumoDocumentosClientes {
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    pendentes: raw.pendentes != null ? Number(raw.pendentes) : numOr0(raw.novos),
    recebidos: numOr0(raw.recebidos),
    emAnalise: numOr0(raw.emAnalise),
    arquivados: numOr0(raw.arquivados),
  };
}

/** Page<PortalDocumentoDTO> do Spring (ou array direto no mock). */
export function normalizePaginaDocumentosClientesFromApi(data: unknown): PaginaDocumentosClientes {
  if (data && typeof data === "object" && "content" in data) {
    const body = data as Record<string, unknown>;
    const content = Array.isArray(body.content)
      ? (body.content as Record<string, unknown>[]).map(normalizeDocumentoClienteFromApi)
      : [];
    return {
      content,
      totalElements: Number(body.totalElements ?? content.length),
      totalPages: Number(body.totalPages ?? 1),
      number: Number(body.number ?? 0),
      size: Number(body.size ?? content.length),
    };
  }
  const list = Array.isArray(data)
    ? (data as Record<string, unknown>[]).map(normalizeDocumentoClienteFromApi)
    : [];
  return {
    content: list,
    totalElements: list.length,
    totalPages: 1,
    number: 0,
    size: list.length,
  };
}

/** Espelha PortalDocumentoDTO (documentoId, nomeOriginal, observacaoCliente, enviadoEm) — visão do cliente. Mock: id, nomeArquivo, observacao, criadoEm. */
export function normalizeDocumentoPortalFromApi(raw: Record<string, unknown>): PortalDocumento {
  return {
    id: String(raw.documentoId ?? raw.id ?? ""),
    tipo: normalizeTipoDocumentoCliente(raw.tipo),
    nomeArquivo: str(raw.nomeOriginal ?? raw.nomeArquivo),
    status: normalizeStatusDocumentoCliente(raw.status),
    observacao: str(raw.observacaoCliente ?? raw.observacao),
    dividaId: str(raw.dividaId),
    criadoEm: str(raw.enviadoEm ?? raw.criadoEm),
    respostaEscritorio: str(raw.respostaEscritorio),
    respondidoEm: str(raw.respondidoEm),
    respondidoPorNome: str(raw.respondidoPorNome),
  };
}

/** Lista de documentos do portal a partir de Page Spring ou array legado. */
export function normalizePaginaDocumentosPortalFromApi(data: unknown): PortalDocumento[] {
  if (data && typeof data === "object" && "content" in data) {
    const body = data as Record<string, unknown>;
    const content = Array.isArray(body.content) ? body.content : [];
    return (content as Record<string, unknown>[]).map(normalizeDocumentoPortalFromApi);
  }
  if (Array.isArray(data)) {
    return (data as Record<string, unknown>[]).map(normalizeDocumentoPortalFromApi);
  }
  return [];
}
