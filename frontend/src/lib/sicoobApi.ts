/**
 * Cliente das rotas /api/sicoob (JWT via interceptor do axios em api.ts).
 * Não armazena client-id/secret — só usa o Bearer do login.
 */

import { api, getApiErrorMessage, normalizeListResponse } from "@/lib/api";
import type { CobrancaSicoob, SicoobStatus } from "@/types/api";

export function normalizeCobrancaSicoobFromApi(raw: Record<string, unknown>): CobrancaSicoob {
  return {
    cobrancaId: String(raw.cobrancaId ?? raw.id ?? ""),
    dividaId: String(raw.dividaId ?? ""),
    protocoloDivida: raw.protocoloDivida != null ? String(raw.protocoloDivida) : undefined,
    tipo: String(raw.tipo ?? "PIX").toUpperCase() as CobrancaSicoob["tipo"],
    status: String(raw.status ?? "PENDENTE"),
    valorCentavos: Number(raw.valorCentavos ?? 0) || 0,
    pixTxid: raw.pixTxid != null ? String(raw.pixTxid) : null,
    pixCopiaECola: raw.pixCopiaECola != null ? String(raw.pixCopiaECola) : null,
    pixQrCode: raw.pixQrCode != null ? String(raw.pixQrCode) : null,
    boletoNossoNumero: raw.boletoNossoNumero != null ? String(raw.boletoNossoNumero) : null,
    boletoLinhaDigitavel: raw.boletoLinhaDigitavel != null ? String(raw.boletoLinhaDigitavel) : null,
    boletoCodigoBarras: raw.boletoCodigoBarras != null ? String(raw.boletoCodigoBarras) : null,
    mensagemErro: raw.mensagemErro != null ? String(raw.mensagemErro) : null,
    criadoEm: raw.criadoEm != null ? String(raw.criadoEm) : null,
    pagoEm: raw.pagoEm != null ? String(raw.pagoEm) : null,
  };
}

export async function fetchSicoobStatus(): Promise<SicoobStatus> {
  try {
    const r = await api.get("/api/sicoob/status");
    const d = (r.data ?? {}) as Record<string, unknown>;
    return {
      enabled: Boolean(d.enabled),
      mock: Boolean(d.mock),
      configuredForApi: Boolean(d.configuredForApi),
      clientIdConfigured: Boolean(d.clientIdConfigured),
      certificateConfigured: Boolean(d.certificateConfigured),
      pixChaveConfigured: Boolean(d.pixChaveConfigured),
      contasBoletoConfigured: Boolean(d.contasBoletoConfigured),
      webhookSecretConfigured: Boolean(d.webhookSecretConfigured),
      mensagem: d.mensagem != null ? String(d.mensagem) : undefined,
    };
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Falha ao consultar status Sicoob"));
  }
}

export async function gerarPixSicoob(dividaId: string): Promise<CobrancaSicoob> {
  try {
    const r = await api.post(`/api/sicoob/dividas/${dividaId}/pix`);
    return normalizeCobrancaSicoobFromApi((r.data ?? {}) as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Falha ao gerar Pix Sicoob"));
  }
}

export async function gerarBoletoSicoob(dividaId: string): Promise<CobrancaSicoob> {
  try {
    const r = await api.post(`/api/sicoob/dividas/${dividaId}/boleto`);
    return normalizeCobrancaSicoobFromApi((r.data ?? {}) as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Falha ao gerar boleto Sicoob"));
  }
}

export async function listarCobrancasSicoob(dividaId: string): Promise<CobrancaSicoob[]> {
  try {
    const r = await api.get(`/api/sicoob/dividas/${dividaId}/cobrancas`);
    const raw = normalizeListResponse<Record<string, unknown>>(r.data);
    return raw.map(normalizeCobrancaSicoobFromApi);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Falha ao listar cobranças Sicoob"));
  }
}

/** Alias documentado para a tela de honorários */
export const listarCobrancasPorDivida = listarCobrancasSicoob;

export const getSicoobStatus = fetchSicoobStatus;

export async function obterCobrancaSicoob(cobrancaId: string): Promise<CobrancaSicoob> {
  try {
    const r = await api.get(`/api/sicoob/cobrancas/${cobrancaId}`);
    return normalizeCobrancaSicoobFromApi((r.data ?? {}) as Record<string, unknown>);
  } catch (e: unknown) {
    throw new Error(getApiErrorMessage(e, "Falha ao consultar cobrança Sicoob"));
  }
}

export function valorCentavosParaReais(centavos: number): number {
  return (Number(centavos) || 0) / 100;
}
