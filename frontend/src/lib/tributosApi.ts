/**
 * Camada de API do simulador tributário (TributoController — /api/tributos).
 */

import { api } from "@/lib/api";

export type CalcularTributoPayload = {
  valor: number;
  tipo: string;
  categoria: string;
  custoAquisicao?: number;
  margemDesejada?: number;
};

/** Espelha CalcularTributoResponseDTO (subconjunto usado pelo front). */
export type CalcularTributoResponse = {
  baseCalculo?: number;
  valorImposto?: number;
  valorSemImposto?: number;
  valorTotal?: number;
  cbs?: number;
  ibs?: number;
  totalImpostos?: number;
  precoVenda?: number;
  margemLucro?: number;
  custoAquisicao?: number;
  /** Campos legados que o front ainda tolera. */
  valorFinal?: number;
  valor?: number;
};

/** POST /api/tributos/calcular */
export async function calcularTributo(
  payload: CalcularTributoPayload,
): Promise<CalcularTributoResponse> {
  const r = await api.post<CalcularTributoResponse>("/api/tributos/calcular", payload);
  return r.data;
}

export type ValidarCreditoPayload = {
  valorVenda: number;
  valorCompras: number;
  categoria: string;
};

/** POST /api/tributos/creditos/validar — o resultado exibido é o da simulação local. */
export async function validarCreditoTributo(payload: ValidarCreditoPayload): Promise<void> {
  await api.post("/api/tributos/creditos/validar", payload);
}

/** Espelha RegimeCnpjResponseDTO (cnpj, nomeEmpresa, regime). */
export type RegimeCnpjResponse = {
  cnpj?: string;
  nomeEmpresa?: string;
  regime?: string;
};

/** GET /api/tributos/regime/{cnpj} */
export async function consultarRegimeCnpj(cnpjDigits: string): Promise<RegimeCnpjResponse> {
  const r = await api.get<RegimeCnpjResponse>(`/api/tributos/regime/${cnpjDigits}`);
  return r.data;
}

/** Espelha ConsultaGeminiResponseDTO (resposta, sucesso, erro). */
export type ConsultaIaResponse = {
  sucesso?: boolean;
  resposta?: string;
  erro?: string | null;
};

/** POST /api/tributos/consulta-ia */
export async function consultarIaTributos(pergunta: string): Promise<ConsultaIaResponse> {
  const r = await api.post<ConsultaIaResponse>("/api/tributos/consulta-ia", { pergunta });
  return r.data;
}

/** GET /api/tributos/cashback?valorCompra&percentualDevolucao */
export async function calcularCashback(
  valorCompra: number,
  percentualDevolucao: number,
): Promise<{ cashbackCBS?: number }> {
  const r = await api.get<{ cashbackCBS?: number }>("/api/tributos/cashback", {
    params: { valorCompra, percentualDevolucao },
  });
  return r.data;
}
