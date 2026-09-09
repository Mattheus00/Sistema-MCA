/**
 * Camada de API de serviços do escritório (ServicoController — /api/servicos).
 */

import { api, normalizeListResponse } from "@/lib/api";
import type { ServicoResumo } from "@/types/api";

/** Espelha ServicoResponseDTO (servicoId, nome, descricao, valorPadrao, ativo). */
export function normalizeServicoFromApi(raw: Record<string, unknown>): ServicoResumo {
  const valor = raw.valorPadrao != null ? Number(raw.valorPadrao) : null;
  return {
    servicoId: String(raw.servicoId ?? ""),
    nome: String(raw.nome ?? ""),
    descricao: raw.descricao != null ? String(raw.descricao) : null,
    valorPadrao: valor != null && Number.isFinite(valor) ? valor : null,
    ativo: raw.ativo !== false,
  };
}

/** GET /api/servicos — apenas serviços ativos. */
export async function listarServicos(): Promise<ServicoResumo[]> {
  const r = await api.get("/api/servicos");
  return normalizeListResponse<Record<string, unknown>>(r.data).map(normalizeServicoFromApi);
}

/** GET /api/servicos/todos (inclui inativos); cai para GET /api/servicos se o endpoint não existir (404). */
export async function listarTodosServicos(): Promise<ServicoResumo[]> {
  let r;
  try {
    r = await api.get("/api/servicos/todos");
  } catch (e: unknown) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) {
      r = await api.get("/api/servicos");
    } else {
      throw e;
    }
  }
  return normalizeListResponse<Record<string, unknown>>(r.data).map(normalizeServicoFromApi);
}

/** Payload de POST/PUT /api/servicos (ServicoDTO). `valorPadrao` em centavos. */
export type ServicoPayload = {
  nome: string;
  descricao?: string;
  ativo: boolean;
  valorPadrao?: number;
};

/** POST /api/servicos */
export async function criarServico(payload: ServicoPayload): Promise<void> {
  await api.post("/api/servicos", payload);
}

/** PUT /api/servicos/{id} */
export async function atualizarServico(servicoId: string, payload: ServicoPayload): Promise<void> {
  await api.put(`/api/servicos/${servicoId}`, payload);
}
