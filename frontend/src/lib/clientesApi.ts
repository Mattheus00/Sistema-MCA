/**
 * Camada de API de clientes (ClienteController — /api/clientes).
 * Componentes não devem chamar `api` diretamente — use as funções daqui.
 */

import { api, extractPageMeta, isMockEnabled, normalizeListResponse } from "@/lib/api";
import { normalizeClienteFromApi, normalizeClienteToApi } from "@/lib/apiNormalizers";
import type { Cliente } from "@/types/api";
import { STATUS_CLIENTE } from "@/lib/constants/status";

export type StatusClienteFiltro =
  typeof STATUS_CLIENTE.ATIVO | typeof STATUS_CLIENTE.INATIVO | typeof STATUS_CLIENTE.INADIMPLENTE;

/** Parâmetros aceitos por GET /api/clientes (Page<ClienteResponseDTO>). */
export type ListarClientesParams = {
  page?: number;
  size?: number;
  statusCliente?: StatusClienteFiltro;
  /** Busca por nome/código/CPF (parâmetro `busca` do backend). */
  busca?: string;
  /** Alias legado usado por alguns formulários (o backend ignora; o mock filtra). */
  termo?: string;
};

export type PaginaClientes = {
  content: Cliente[];
  totalPages?: number;
  last?: boolean;
};

function limparParams(params: ListarClientesParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v as string | number;
  }
  return out;
}

/** GET /api/clientes — uma página normalizada com metadados de paginação. */
export async function listarClientesPagina(params: ListarClientesParams): Promise<PaginaClientes> {
  const r = await api.get("/api/clientes", { params: limparParams(params) });
  const content = normalizeListResponse<Record<string, unknown>>(r.data).map((c) =>
    normalizeClienteFromApi(c),
  );
  const meta = extractPageMeta(r.data);
  return { content, totalPages: meta.totalPages, last: meta.last };
}

/** GET /api/clientes — só o conteúdo da página. */
export async function listarClientes(params: ListarClientesParams): Promise<Cliente[]> {
  return (await listarClientesPagina(params)).content;
}

/** Busca todas as páginas Spring até esgotar (evita o teto antigo de 100). */
export async function listarTodosClientes(
  termo: string | undefined,
  statusCliente: StatusClienteFiltro,
): Promise<Cliente[]> {
  const pageSize = 200;
  const all: Cliente[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const r = await api.get("/api/clientes", {
      params: limparParams({ page, size: pageSize, statusCliente, busca: termo?.trim() }),
    });
    const data = r.data;
    const rawList = normalizeListResponse<Record<string, unknown>>(data);
    all.push(...rawList.map((c) => normalizeClienteFromApi(c)));

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const meta = extractPageMeta(data);
      if (typeof meta.totalPages === "number") {
        totalPages = Math.max(1, meta.totalPages);
      } else if (meta.last === true || rawList.length < pageSize) {
        break;
      } else {
        totalPages = page + 2;
      }
    } else {
      break;
    }
    page += 1;
    // segurança: evita loop infinito se a API ignorar page
    if (page > 50) break;
  }
  return all;
}

/** GET /api/clientes/{id} → ClienteResponseDTO. */
export async function obterCliente(clienteId: string): Promise<Cliente> {
  const r = await api.get(`/api/clientes/${clienteId}`);
  const raw = r?.data && typeof r.data === "object" ? (r.data as Record<string, unknown>) : {};
  return normalizeClienteFromApi(raw);
}

/** Payload de criação/edição: mock recebe o formato do frontend; API real recebe ClienteDTO. */
function montarPayloadCliente(form: Cliente, id?: string): Record<string, unknown> {
  if (isMockEnabled()) {
    return {
      ...form,
      ...(id != null ? { id } : {}),
      codigo: form.codigo?.trim().toUpperCase() || undefined,
      cpf: form.cpf?.trim() || undefined,
      celular: form.celular?.replace(/\D/g, "") || undefined,
    };
  }
  return normalizeClienteToApi(id != null ? { ...form, id } : form);
}

/** POST /api/clientes → ClienteResponseDTO normalizado. */
export async function criarCliente(form: Cliente): Promise<Cliente> {
  const r = await api.post("/api/clientes", montarPayloadCliente(form));
  const raw = r?.data && typeof r.data === "object" ? (r.data as Record<string, unknown>) : {};
  return normalizeClienteFromApi(raw);
}

/** PATCH /api/clientes/{id} — atualização parcial. */
export async function atualizarCliente(clienteId: string, form: Cliente): Promise<void> {
  await api.patch(`/api/clientes/${clienteId}`, montarPayloadCliente(form, clienteId));
}

/** DELETE /api/clientes/{id} — soft delete (marca como inativo). */
export async function excluirCliente(clienteId: string): Promise<void> {
  await api.delete(`/api/clientes/${clienteId}`);
}
