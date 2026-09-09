/**
 * Camada de API de inadimplências, pagamentos, configuração de juros e notificações de cobrança.
 * Endpoints: InadimplenciaController, PagamentoController, JurosConfigController, NotificacaoController.
 * Componentes não devem chamar `api` diretamente — use as funções daqui.
 */

import { api, isMockEnabled, normalizeListResponse } from "@/lib/api";
import {
  normalizeInadimplenciaFromApi,
  normalizeInadimplenciaToApi,
  normalizePagamentoInadimplenciaFromApi,
} from "@/lib/apiNormalizers";
import type {
  Inadimplencia,
  NotificacaoCobrancaResponse,
  PagamentoInadimplencia,
} from "@/types/api";

/** No mock a resposta já está no formato do frontend; na API real passa pelo normalizer. */
function mapInadimplenciaResponseItem(raw: Record<string, unknown>): Inadimplencia {
  return isMockEnabled() ? (raw as Inadimplencia) : normalizeInadimplenciaFromApi(raw);
}

/** GET /api/inadimplentes?paginado=false — lista completa em uma única requisição. */
export async function listarInadimplentes(): Promise<Inadimplencia[]> {
  const r = await api.get("/api/inadimplentes", { params: { paginado: false } });
  return normalizeListResponse<Record<string, unknown>>(r.data).map(mapInadimplenciaResponseItem);
}

/** Carrega todas as inadimplências, percorrendo páginas quando a API retorna PageResponse. */
export async function fetchAllInadimplentes(): Promise<Inadimplencia[]> {
  const first = await api.get("/api/inadimplentes", { params: { paginado: false } });
  const data = first.data;

  if (Array.isArray(data)) {
    return data.map((item) => mapInadimplenciaResponseItem(item as Record<string, unknown>));
  }

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { content?: unknown[] }).content)
  ) {
    const body = data as {
      content: Record<string, unknown>[];
      totalPages?: number;
      last?: boolean;
      size?: number;
    };
    const all = body.content.map(mapInadimplenciaResponseItem);
    const pageSize = body.size && body.size > 0 ? body.size : Math.max(body.content.length, 200);
    let page = 1;
    let totalPages = body.totalPages ?? 1;

    while (page < totalPages) {
      const r = await api.get("/api/inadimplentes", {
        params: { paginado: true, page, size: pageSize },
      });
      const pageData = r.data as {
        content?: Record<string, unknown>[];
        totalPages?: number;
        last?: boolean;
      };
      const chunk = Array.isArray(pageData.content)
        ? pageData.content.map(mapInadimplenciaResponseItem)
        : [];
      if (chunk.length === 0) break;
      all.push(...chunk);
      if (pageData.last === true) break;
      if (typeof pageData.totalPages === "number") totalPages = pageData.totalPages;
      page += 1;
      if (page > 100) break;
    }

    return all;
  }

  return normalizeListResponse<Record<string, unknown>>(data).map(mapInadimplenciaResponseItem);
}

export type NovaInadimplenciaPayload = {
  clienteId: string;
  valor: number;
  vencimento: string;
  descricao?: string;
};

/** POST /api/inadimplentes (InadimplenciaPayloadDTO). No mock o payload vai no formato do frontend. */
export async function criarInadimplencia(payload: NovaInadimplenciaPayload): Promise<void> {
  const body = isMockEnabled() ? payload : normalizeInadimplenciaToApi(payload);
  await api.post("/api/inadimplentes", body);
}

export type ConfirmarPagamentoTotalPayload = {
  desconto: number;
  metodoPagamento: string;
  observacao?: string;
  dataPagamento: string;
  confirmadoPor?: string;
  registradoPor?: string;
};

/** PATCH /api/inadimplentes/{id} com status "Pago" (InadimplenciaStatusDTO). */
export async function confirmarPagamentoTotal(
  dividaId: string,
  payload: ConfirmarPagamentoTotalPayload,
): Promise<void> {
  await api.patch(`/api/inadimplentes/${dividaId}`, { status: "Pago", ...payload });
}

/** DELETE /api/inadimplentes/{id} — cancelamento (soft delete). */
export async function cancelarInadimplencia(dividaId: string): Promise<void> {
  await api.delete(`/api/inadimplentes/${dividaId}`);
}

export type RegistrarPagamentoPayload = {
  dividaId?: string;
  /** Em centavos (contrato do POST /api/pagamentos). */
  valorPago: number;
  dataPagamento: string;
  metodoPagamento: string;
  confirmadoPor?: string;
  comprovante?: string;
};

/** POST /api/pagamentos (PagamentoDTO). */
export async function registrarPagamento(payload: RegistrarPagamentoPayload): Promise<void> {
  await api.post("/api/pagamentos", payload);
}

/** GET /api/pagamentos/divida/{dividaId} → PagamentoResponseDTO[]. */
export async function listarPagamentosDivida(dividaId: string): Promise<PagamentoInadimplencia[]> {
  const r = await api.get(`/api/pagamentos/divida/${dividaId}`);
  return normalizeListResponse<Record<string, unknown>>(r.data).map((raw) =>
    normalizePagamentoInadimplenciaFromApi(raw),
  );
}

/** GET /api/pagamentos?dividaId= — variante legada usada como fallback (só existe no mock). */
export async function listarPagamentosPorQuery(
  dividaId: string,
): Promise<PagamentoInadimplencia[]> {
  const r = await api.get("/api/pagamentos", { params: { dividaId } });
  return normalizeListResponse<Record<string, unknown>>(r.data).map((raw) =>
    normalizePagamentoInadimplenciaFromApi(raw),
  );
}

/** Espelha JurosConfigDTO (multaDiaria, capMultaPercentual, jurosMensal) — frações (0.02 = 2%). */
export type JurosConfig = {
  multaDiaria?: number;
  capMultaPercentual?: number;
  jurosMensal?: number;
};

/** GET /api/config/juros. */
export async function obterConfigJuros(): Promise<JurosConfig> {
  const r = await api.get<JurosConfig | null | undefined>("/api/config/juros");
  return r.data ?? {};
}

/** PUT /api/config/juros. */
export async function salvarConfigJuros(cfg: Required<JurosConfig>): Promise<void> {
  await api.put("/api/config/juros", cfg);
}

/** POST multipart /api/notificacoes/enviar-aviso-pendencia → NotificacaoResponseDTO. */
export async function enviarAvisoPendencia(
  clienteId: string,
  arquivo: Blob,
  nomeArquivo: string,
): Promise<NotificacaoCobrancaResponse> {
  const form = new FormData();
  form.append("clienteId", clienteId);
  form.append("arquivo", arquivo, nomeArquivo);
  const r = await api.post<NotificacaoCobrancaResponse>(
    "/api/notificacoes/enviar-aviso-pendencia",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    },
  );
  return r.data;
}
