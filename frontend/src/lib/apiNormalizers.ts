/**
 * Normaliza respostas e payloads entre backend (API real) e tipos do frontend.
 * Usar quando VITE_USE_MOCK=false para compatibilidade com o backend.
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
} from "@/types/api";

/** Prefixo gravado em `comprovante` para persistir quem confirmou. */
const CONFIRMADO_POR_COMPROVANTE_PREFIX = "user:";

function decodeConfirmadoPorComprovante(comprovante: string | null | undefined): string | undefined {
  if (!comprovante) return undefined;
  const s = comprovante.trim();
  if (!s.toLowerCase().startsWith(CONFIRMADO_POR_COMPROVANTE_PREFIX)) return undefined;
  const nome = s.slice(CONFIRMADO_POR_COMPROVANTE_PREFIX.length).trim();
  return nome || undefined;
}

/** Backend pode retornar clienteId em vez de id, statusCliente em vez de situacao, criadoEm/atualizadoEm */
export function normalizeClienteFromApi(raw: Record<string, unknown>): Cliente {
  const id = raw.id ?? raw.clienteId;
  const situacao = raw.situacao ?? mapStatusClienteToSituacao(String(raw.statusCliente ?? ""));
  return {
    id: id != null ? String(id) : undefined,
    codigo: raw.codigo != null ? String(raw.codigo) : undefined,
    nome: String(raw.nome ?? ""),
    email: raw.email != null ? String(raw.email) : undefined,
    cpf: raw.cpf != null ? String(raw.cpf) : raw.cpfCnpj != null ? String(raw.cpfCnpj) : undefined,
    telefone: raw.telefone != null ? String(raw.telefone) : raw.telefoneFixo != null ? String(raw.telefoneFixo) : undefined,
    celular: raw.celular != null ? String(raw.celular) : undefined,
    endereco: raw.endereco != null ? String(raw.endereco) : undefined,
    situacao: situacao as Cliente["situacao"],
    saldoDevedorTotal:
      raw.saldoDevedorTotal != null
        ? Number(raw.saldoDevedorTotal)
        : raw.saldoDevedor != null
          ? Number(raw.saldoDevedor)
          : undefined,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : raw.criadoEm != null ? String(raw.criadoEm) : undefined,
    updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : raw.atualizadoEm != null ? String(raw.atualizadoEm) : undefined,
  };
}

function mapStatusClienteToSituacao(status: string): string {
  const u = status.toUpperCase();
  if (u === "ATIVO") return "Ativo";
  if (u === "INADIMPLENTE") return "Inadimplente";
  if (u === "INATIVO") return "Inativo";
  return status || "Ativo";
}

/** Payload para backend: statusCliente em maiúsculas, cpfCnpj (backend aceita cpf como alias) */
export function normalizeClienteToApi(c: Partial<Cliente>): Record<string, unknown> {
  const situacao = c.situacao ?? "Ativo";
  const statusCliente = situacao === "Ativo" ? "ATIVO" : situacao === "Inadimplente" ? "INADIMPLENTE" : "INATIVO";
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

/** Extrai nome/login do usuário que confirmou o pagamento a partir de campos comuns da API. */
function extrairConfirmadoPor(raw: Record<string, unknown>): string | undefined {
  const candidatos = [
    raw.confirmadoPor,
    raw.confirmadoPorNome,
    raw.registradoPor,
    raw.registradoPorNome,
    raw.criadoPor,
    raw.criadoPorNome,
    raw.usuarioNome,
    raw.usuarioLogin,
    raw.nomeUsuario,
    raw.loginUsuario,
    raw.operadorNome,
    raw.operador,
    raw.usuarioConfirmacao,
    raw.createdBy,
    raw.createdByName,
  ];
  for (const c of candidatos) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  const usuario = raw.usuario;
  if (usuario && typeof usuario === "object") {
    const u = usuario as Record<string, unknown>;
    const nome = u.nome ?? u.login ?? u.name ?? u.username;
    if (nome != null && String(nome).trim()) return String(nome).trim();
  }
  const fromComprovante = decodeConfirmadoPorComprovante(
    raw.comprovante != null ? String(raw.comprovante) : undefined
  );
  if (fromComprovante) return fromComprovante;

  const obs = raw.observacao != null ? String(raw.observacao) : "";
  const matchObs = obs.match(/Confirmado por:\s*(.+)/i);
  if (matchObs?.[1]?.trim()) return matchObs[1].trim();

  return undefined;
}

/** Pagamentos embutidos na dívida: valorPago em reais (DTO de resposta). */
export function normalizePagamentoInadimplenciaFromApi(raw: Record<string, unknown>): PagamentoInadimplencia {
  const valorBruto = Number(raw.valorPago ?? raw.valor ?? 0);
  const valorPago = Number.isFinite(valorBruto) ? valorBruto : 0;
  const id =
    raw.pagamentoId != null
      ? String(raw.pagamentoId)
      : raw.id != null
        ? String(raw.id)
        : undefined;
  return {
    pagamentoId: id,
    dividaId: raw.dividaId != null ? String(raw.dividaId) : undefined,
    protocoloDivida: raw.protocoloDivida != null ? String(raw.protocoloDivida) : undefined,
    valorPago,
    dataPagamento: String(raw.dataPagamento ?? ""),
    metodoPagamento: raw.metodoPagamento != null ? String(raw.metodoPagamento) : undefined,
    comprovante: raw.comprovante != null ? String(raw.comprovante) : undefined,
    criadoEm: raw.criadoEm != null ? String(raw.criadoEm) : undefined,
    confirmadoPor: extrairConfirmadoPor(raw),
  };
}

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

function normalizeVencimentoFromApi(raw: Record<string, unknown>): string {
  const candidatos = [raw.vencimento, raw.dataVencimento, raw.dataVencimentoOriginal, raw.mesReferencia];
  for (const candidato of candidatos) {
    if (candidato == null) continue;
    const texto = String(candidato).trim();
    if (!texto) continue;
    if (/^\d{4}-\d{2}/.test(texto)) return texto;
    const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  }
  return "";
}

export function normalizeInadimplenciaFromApi(raw: Record<string, unknown>): Inadimplencia {
  const valor = Number(raw.valor ?? raw.valorDevedor ?? 0);
  const valorOriginal = raw.valorOriginal != null ? Number(raw.valorOriginal) : undefined;
  const juros = raw.juros != null ? Number(raw.juros) : undefined;
  const valorDevedor = raw.valorDevedor != null ? Number(raw.valorDevedor) : undefined;
  const multaDiaPercent =
    (raw.multaDiaPercent as number | undefined) ??
    (raw.multaDiariaPercent as number | undefined) ??
    (raw.multaPercent as number | undefined);
  const jurosMesPercent =
    (raw.jurosMesPercent as number | undefined) ??
    (raw.jurosAoMesPercent as number | undefined) ??
    (raw.jurosPercent as number | undefined);
  const conv = (v: number) => (VALOR_CENTAVOS ? v / 100 : v);
  const pagamentosRaw = raw.pagamentos;
  let pagamentos: PagamentoInadimplencia[] | undefined;
  if (Array.isArray(pagamentosRaw)) {
    pagamentos = pagamentosRaw
      .filter((p): p is Record<string, unknown> => p != null && typeof p === "object")
      .map((p) => normalizePagamentoInadimplenciaFromApi(p));
  }
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    clienteId: raw.clienteId != null ? String(raw.clienteId) : "",
    clienteNome: raw.clienteNome != null ? String(raw.clienteNome) : undefined,
    valor: conv(valor),
    valorOriginal: valorOriginal != null ? conv(valorOriginal) : undefined,
    juros: juros != null ? conv(juros) : undefined,
    valorDevedor: valorDevedor != null ? conv(valorDevedor) : undefined,
    detalhesJuros: raw.detalhesJuros != null ? String(raw.detalhesJuros) : undefined,
    multaDiaPercent: multaDiaPercent != null ? Number(multaDiaPercent) : undefined,
    jurosMesPercent: jurosMesPercent != null ? Number(jurosMesPercent) : undefined,
    vencimento: normalizeVencimentoFromApi(raw),
    descricao: raw.descricao != null ? String(raw.descricao) : undefined,
    status: normalizeStatusInadimplenciaFromApi(raw.status),
    createdAt:
      raw.createdAt != null
        ? String(raw.createdAt)
        : raw.criadoEm != null
          ? String(raw.criadoEm)
          : undefined,
    updatedAt:
      raw.updatedAt != null
        ? String(raw.updatedAt)
        : raw.atualizadoEm != null
          ? String(raw.atualizadoEm)
          : undefined,
    pagamentos,
  };
}

/** Payload para POST inadimplentes: valor em reais */
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

/** Backend retorna { limite, ranking: [] }; ranking[].nomeCliente, saldoDevedor. Campos opcionais: qtdDividas, mediaDiasAtraso, status */
export function normalizeRankingFromApi(data: unknown): RankingDevedorItem[] {
  if (!data || typeof data !== "object" || !("ranking" in data)) return [];
  const arr = (data as { ranking?: unknown[] }).ranking;
  if (!Array.isArray(arr)) return [];
  return arr.map((item, i: number) => {
    const r = item as Record<string, unknown>;
    return {
    posicao: Number(r.posicao ?? i + 1),
    clienteId: r.clienteId != null ? String(r.clienteId) : "",
    clienteNome: String(r.nomeCliente ?? r.clienteNome ?? ""),
    cpfCnpj: String(r.cpfCnpj ?? ""),
    valorDevido: Number(r.saldoDevedor ?? r.valorDevido ?? 0),
    qtdDividas: Number(r.quantidadeDividas ?? r.qtdDividas ?? 0),
    mediaDiasAtraso: Number(r.mediaDiasAtraso ?? 0),
    status: (r.status as RankingDevedorItem["status"]) ?? "Recente",
    };
  });
}

/** Backend retorna periodoInicio, periodoFim, totalClientesInadimplentes, valorTotalInadimplente, itens[] */
export function normalizeInadimplenciaPeriodoFromApi(data: unknown): InadimplenciaPeriodoRelatorio | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const itens = d.itens ?? d.detalhamento;
  const arr = Array.isArray(itens) ? itens : [];
  const detalhamento = arr.map((x: Record<string, unknown>) => ({
    clienteId: x.clienteId != null ? String(x.clienteId) : "",
    clienteNome: String(x.nomeCliente ?? x.clienteNome ?? ""),
    cpfCnpj: String(x.cpfCnpj ?? ""),
    qtdDividas: Number(x.quantidadeDividas ?? x.qtdDividas ?? 0),
    valorTotal: Number(x.saldoDevedor ?? x.valorTotal ?? 0),
    statusPior: (x.statusPior as InadimplenciaPeriodoRelatorio["detalhamento"][0]["statusPior"]) ?? "EM_ABERTO",
  }));
  return {
    dataInicio: String(d.periodoInicio ?? d.dataInicio ?? ""),
    dataFim: String(d.periodoFim ?? d.dataFim ?? ""),
    totalClientes: Number(d.totalClientesInadimplentes ?? d.totalClientes ?? 0),
    valorTotal: Number(d.valorTotalInadimplente ?? d.valorTotal ?? 0),
    dividasVencidasNoPeriodo: Number(d.dividasVencidasNoPeriodo ?? arr.length),
    valorVencidoNoPeriodo: Number(d.valorVencidoNoPeriodo ?? d.valorTotal ?? 0),
    detalhamento,
  };
}

/** Backend pode retornar totalRecebido (resumo-financeiro) ou totalPago (resumo legado). */
export function normalizeResumoFinanceiroFromApi(data: unknown): ResumoFinanceiro | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const conv = (v: number) => (VALOR_CENTAVOS ? v / 100 : v);
  return {
    totalEmAberto: conv(Number(d.totalEmAberto ?? 0)),
    totalRecebido: conv(Number(d.totalRecebido ?? d.totalPago ?? 0)),
    periodoInicio: d.periodoInicio != null ? String(d.periodoInicio) : d.dataInicio != null ? String(d.dataInicio) : undefined,
    periodoFim: d.periodoFim != null ? String(d.periodoFim) : d.dataFim != null ? String(d.dataFim) : undefined,
  };
}

/** Normaliza GET /api/relatorios/resumo (dashboard). Valores monetários em reais quando VALOR_CENTAVOS=false. */
export function normalizeResumoRelatorioFromApi(data: unknown): ResumoRelatorio | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const conv = (v: number) => (VALOR_CENTAVOS ? v / 100 : v);
  return {
    totalClientes: Number(d.totalClientes ?? 0),
    totalDividas: Number(d.totalDividas ?? 0),
    totalEmAberto: conv(Number(d.totalEmAberto ?? 0)),
    totalPago: conv(Number(d.totalPago ?? d.totalRecebido ?? 0)),
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

export function normalizePagamentoRecebidoItemFromApi(raw: Record<string, unknown>): PagamentoRecebidoItem {
  const conv = (v: number) => (VALOR_CENTAVOS ? v / 100 : v);
  const valorBruto = Number(raw.valor ?? raw.valorPago ?? raw.valorRecebido ?? 0);
  const vencimento =
    raw.vencimento != null
      ? String(raw.vencimento)
      : raw.mesReferencia != null && /^\d{4}-\d{2}/.test(String(raw.mesReferencia))
        ? String(raw.mesReferencia)
        : undefined;
  const mesReferencia =
    raw.mesReferencia != null && !/^\d{4}-\d{2}/.test(String(raw.mesReferencia))
      ? String(raw.mesReferencia)
      : raw.mes != null
        ? String(raw.mes)
        : raw.referencia != null
          ? String(raw.referencia)
          : undefined;
  return {
    data: String(raw.data ?? raw.dataPagamento ?? ""),
    clienteNome: String(raw.clienteNome ?? raw.nomeCliente ?? "—"),
    protocolo: String(raw.protocolo ?? ""),
    valor: Number.isFinite(valorBruto) ? conv(valorBruto) : 0,
    metodo: String(raw.metodo ?? raw.metodoPagamento ?? "—"),
    saldoRestante: conv(Number(raw.saldoRestante ?? 0)),
    mesReferencia,
    vencimento,
    confirmadoPor: extrairConfirmadoPor(raw),
  };
}

/** Normaliza GET /api/relatorios/pagamentos-recebidos. */
export function normalizePagamentosRecebidosFromApi(data: unknown): PagamentosRecebidosRelatorio | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const conv = (v: number) => (VALOR_CENTAVOS ? v / 100 : v);
  const listaRaw = Array.isArray(d.detalhamento)
    ? d.detalhamento
    : Array.isArray(d.pagamentos)
      ? d.pagamentos
      : Array.isArray(d.itens)
        ? d.itens
        : [];
  const detalhamento = (listaRaw as Record<string, unknown>[]).map(normalizePagamentoRecebidoItemFromApi);
  const valorTotalBruto = Number(d.valorTotal ?? d.totalRecebido ?? d.valorTotalRecebido ?? 0);
  return {
    dataInicio: String(d.dataInicio ?? d.periodoInicio ?? ""),
    dataFim: String(d.dataFim ?? d.periodoFim ?? ""),
    totalPagamentos: Number(d.totalPagamentos ?? detalhamento.length),
    valorTotal: Number.isFinite(valorTotalBruto)
      ? conv(valorTotalBruto)
      : detalhamento.reduce((s, i) => s + i.valor, 0),
    porMetodo: Array.isArray(d.porMetodo)
      ? (d.porMetodo as Record<string, unknown>[]).map((m) => ({
          metodo: String(m.metodo ?? ""),
          valor: conv(Number(m.valor ?? 0)),
          percentual: Number(m.percentual ?? 0),
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

export function normalizeItemEnvioBoletoFromApi(raw: Record<string, unknown>): ItemEnvioBoleto {
  const envioBoletoId = String(raw.envioBoletoId ?? raw.itemId ?? raw.id ?? "");
  return {
    envioBoletoId,
    itemId: envioBoletoId,
    nomeArquivoOriginal: String(raw.nomeArquivoOriginal ?? raw.nomeArquivo ?? raw.arquivo ?? ""),
    tamanhoBytes: raw.tamanhoBytes != null ? Number(raw.tamanhoBytes) : raw.tamanho != null ? Number(raw.tamanho) : undefined,
    clienteId: raw.clienteId != null ? String(raw.clienteId) : undefined,
    clienteNome: raw.clienteNome != null ? String(raw.clienteNome) : raw.nomeCliente != null ? String(raw.nomeCliente) : undefined,
    documentoMascarado:
      raw.documentoMascarado != null
        ? String(raw.documentoMascarado)
        : raw.cpfCnpj != null
          ? String(raw.cpfCnpj)
          : raw.cpf != null
            ? String(raw.cpf)
            : undefined,
    emailDestinatario:
      raw.emailDestinatario != null ? String(raw.emailDestinatario) : raw.email != null ? String(raw.email) : undefined,
    metodoIdentificacao: raw.metodoIdentificacao != null ? String(raw.metodoIdentificacao) : raw.metodo != null ? String(raw.metodo) : undefined,
    confiancaIdentificacao: normalizeConfianca(raw.confiancaIdentificacao ?? raw.confianca ?? raw.nivelConfianca),
    status: normalizeStatusItem(raw.status),
    bloqueado: raw.bloqueado === true || String(raw.bloqueado ?? "").toLowerCase() === "true",
    motivoBloqueio: raw.motivoBloqueio != null ? String(raw.motivoBloqueio) : raw.motivo != null ? String(raw.motivo) : undefined,
    erro: raw.erro != null ? String(raw.erro) : raw.mensagemErro != null ? String(raw.mensagemErro) : undefined,
    simulado: raw.simulado === true || String(raw.simulado ?? "").toLowerCase() === "true",
  };
}

function buildResumoFromItens(itens: ItemEnvioBoleto[]): ResumoLoteEnvioBoleto {
  const statusApi = (i: ItemEnvioBoleto) => String(i.status ?? "").toUpperCase();
  return {
    semEmail: itens.filter((i) => !i.emailDestinatario?.trim() && statusApi(i) === "AGUARDANDO_CORRECAO").length,
    prontosParaEnvio: itens.filter((i) => statusApi(i) === "PRONTO_PARA_ENVIO").length,
    ignorados: itens.filter((i) => String(i.status).toUpperCase() === "IGNORADO").length,
    enviados: itens.filter((i) => String(i.status).toUpperCase() === "ENVIADO").length,
    erros: itens.filter((i) => String(i.status).toUpperCase() === "ERRO").length,
    duplicados: itens.filter((i) => String(i.status).toUpperCase() === "DUPLICADO").length,
    bloqueados: itens.filter((i) => i.bloqueado || String(i.status).toUpperCase() === "BLOQUEADO").length,
    aguardandoCorrecao: itens.filter((i) => String(i.status).toUpperCase() === "AGUARDANDO_CORRECAO").length,
    naoIdentificados: itens.filter(
      (i) =>
        String(i.status).toUpperCase() === "NAO_IDENTIFICADO" ||
        String(i.metodoIdentificacao ?? "").toUpperCase() === "NAO_IDENTIFICADO" ||
        !i.clienteNome?.trim()
    ).length,
  };
}

function normalizeResumoLoteFromApi(raw: Record<string, unknown> | undefined, itens: ItemEnvioBoleto[]): ResumoLoteEnvioBoleto {
  if (!raw) return buildResumoFromItens(itens);
  return {
    semEmail: Number(raw.semEmail ?? 0),
    prontosParaEnvio: Number(raw.prontosParaEnvio ?? raw.prontos ?? 0),
    ignorados: Number(raw.ignorados ?? 0),
    enviados: Number(raw.enviados ?? 0),
    erros: Number(raw.erros ?? 0),
    duplicados: Number(raw.duplicados ?? 0),
    bloqueados: Number(raw.bloqueados ?? 0),
    aguardandoCorrecao: Number(raw.aguardandoCorrecao ?? 0),
    naoIdentificados: Number(raw.naoIdentificados ?? 0),
  };
}

export function normalizeValidacaoLoteFromApi(raw: Record<string, unknown> | undefined): ValidacaoLoteEnvioBoleto | undefined {
  if (!raw) return undefined;

  const validacaoAninhada =
    raw.validacao && typeof raw.validacao === "object" ? (raw.validacao as Record<string, unknown>) : undefined;

  const bloqueiosRaw = Array.isArray(raw.bloqueios)
    ? (raw.bloqueios as Record<string, unknown>[])
    : validacaoAninhada && Array.isArray(validacaoAninhada.bloqueios)
      ? (validacaoAninhada.bloqueios as Record<string, unknown>[])
      : [];

  const podeEnviarRaw = raw.podeEnviar ?? validacaoAninhada?.podeEnviar;

  if (podeEnviarRaw === undefined && bloqueiosRaw.length === 0) return undefined;

  return {
    podeEnviar: podeEnviarRaw === true || String(podeEnviarRaw ?? "").toLowerCase() === "true",
    bloqueios: bloqueiosRaw.map((b) => ({
      itemId: String(b.itemId ?? b.envioBoletoId ?? b.id ?? ""),
      motivo: String(b.motivo ?? b.mensagem ?? ""),
    })),
  };
}

export function normalizeLoteEnvioBoletoFromApi(raw: Record<string, unknown>): LoteEnvioBoleto {
  const itensRaw = Array.isArray(raw.itens) ? (raw.itens as Record<string, unknown>[]) : [];
  const itens = itensRaw.map(normalizeItemEnvioBoletoFromApi);
  const resumoRaw = raw.resumo && typeof raw.resumo === "object" ? (raw.resumo as Record<string, unknown>) : undefined;
  return {
    loteId: String(raw.loteId ?? raw.id ?? ""),
    status: String(raw.status ?? "CONFERENCIA"),
    criadoEm: raw.criadoEm != null ? String(raw.criadoEm) : raw.createdAt != null ? String(raw.createdAt) : undefined,
    enviadoEm: raw.enviadoEm != null ? String(raw.enviadoEm) : undefined,
    criadoPor: raw.criadoPor != null ? String(raw.criadoPor) : undefined,
    quantidadeTotal: raw.quantidadeTotal != null ? Number(raw.quantidadeTotal) : raw.totalItens != null ? Number(raw.totalItens) : itens.length,
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

export function normalizeLoteResumoFromApi(raw: Record<string, unknown>): LoteEnvioBoletoResumo {
  return {
    loteId: String(raw.loteId ?? raw.id ?? ""),
    status: String(raw.status ?? ""),
    criadoEm: raw.criadoEm != null ? String(raw.criadoEm) : undefined,
    enviadoEm: raw.dataFinalizacao != null ? String(raw.dataFinalizacao) : raw.enviadoEm != null ? String(raw.enviadoEm) : undefined,
    criadoPor:
      raw.criadoPor != null
        ? String(raw.criadoPor)
        : raw.usuarioResponsavelNome != null
          ? String(raw.usuarioResponsavelNome)
          : undefined,
    totalItens:
      raw.totalItens != null
        ? Number(raw.totalItens)
        : raw.quantidadeTotal != null
          ? Number(raw.quantidadeTotal)
          : undefined,
    enviados:
      raw.enviados != null
        ? Number(raw.enviados)
        : raw.quantidadeEnviada != null
          ? Number(raw.quantidadeEnviada)
          : undefined,
    erros:
      raw.erros != null
        ? Number(raw.erros)
        : raw.quantidadeComErro != null
          ? Number(raw.quantidadeComErro)
          : undefined,
  };
}

function normalizeResultadoEnvioItemFromApi(raw: Record<string, unknown>): ResultadoEnvioItem {
  return {
    envioBoletoId: String(raw.envioBoletoId ?? raw.itemId ?? ""),
    clienteId: raw.clienteId != null ? String(raw.clienteId) : undefined,
    clienteNome: raw.clienteNome != null ? String(raw.clienteNome) : undefined,
    emailDestinatario: raw.emailDestinatario != null ? String(raw.emailDestinatario) : undefined,
    nomeArquivoOriginal: raw.nomeArquivoOriginal != null ? String(raw.nomeArquivoOriginal) : undefined,
    status: raw.status != null ? String(raw.status) : undefined,
    simulado: Boolean(raw.simulado),
    reenvio: Boolean(raw.reenvio),
    mensagemErro:
      raw.mensagemErro != null
        ? String(raw.mensagemErro)
        : raw.erro != null
          ? String(raw.erro)
          : null,
    dataEnvio: raw.dataEnvio != null ? String(raw.dataEnvio) : undefined,
  };
}

export function normalizeResultadoEnvioLoteFromApi(raw: Record<string, unknown>): ResultadoEnvioLote {
  const mapLista = (lista: unknown): ResultadoEnvioItem[] =>
    Array.isArray(lista) ? (lista as Record<string, unknown>[]).map(normalizeResultadoEnvioItemFromApi) : [];

  return {
    loteId: String(raw.loteId ?? raw.id ?? ""),
    status: raw.status != null ? String(raw.status) : undefined,
    criadoEm: raw.criadoEm != null ? String(raw.criadoEm) : undefined,
    dataFinalizacao: raw.dataFinalizacao != null ? String(raw.dataFinalizacao) : undefined,
    quantidadeTotal: raw.quantidadeTotal != null ? Number(raw.quantidadeTotal) : undefined,
    quantidadeEnviada: raw.quantidadeEnviada != null ? Number(raw.quantidadeEnviada) : undefined,
    quantidadeComErro: raw.quantidadeComErro != null ? Number(raw.quantidadeComErro) : undefined,
    quantidadeNaoEnviada: raw.quantidadeNaoEnviada != null ? Number(raw.quantidadeNaoEnviada) : undefined,
    enviados: mapLista(raw.enviados),
    comErro: mapLista(raw.comErro),
    naoEnviados: mapLista(raw.naoEnviados),
  };
}

export function normalizePaginaLotesEnvioFromApi(data: unknown): PaginaLotesEnvioBoleto {
  if (data && typeof data === "object" && "content" in data) {
    const body = data as Record<string, unknown>;
    const content = Array.isArray(body.content) ? (body.content as Record<string, unknown>[]).map(normalizeLoteResumoFromApi) : [];
    return {
      content,
      totalElements: Number(body.totalElements ?? content.length),
      totalPages: Number(body.totalPages ?? 1),
      number: Number(body.number ?? 0),
      size: Number(body.size ?? content.length),
    };
  }
  const list = Array.isArray(data) ? (data as Record<string, unknown>[]).map(normalizeLoteResumoFromApi) : [];
  return {
    content: list,
    totalElements: list.length,
    totalPages: 1,
    number: 0,
    size: list.length,
  };
}
