import { api, getAuthToken, isMockEnabled } from "@/lib/api";
import {
  normalizeDocumentoClienteFromApi,
  normalizePaginaDocumentosClientesFromApi,
  normalizeResumoDocumentosClientesFromApi,
} from "@/lib/apiNormalizers";
import type { DocumentoCliente, PaginaDocumentosClientes, ResumoDocumentosClientes, StatusDocumentoCliente } from "@/types/api";

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

export type ListarDocumentosClientesParams = {
  clienteId?: string;
  status?: StatusDocumentoCliente | "";
  tipo?: string;
  page?: number;
  size?: number;
};

export async function listarDocumentosClientes(
  params: ListarDocumentosClientesParams = {}
): Promise<PaginaDocumentosClientes> {
  const query: Record<string, string | number> = {
    page: params.page ?? 0,
    size: params.size ?? 20,
  };
  if (params.clienteId?.trim()) query.clienteId = params.clienteId.trim();
  if (params.status) query.status = params.status;
  if (params.tipo?.trim()) query.tipo = params.tipo.trim();

  const r = await api.get("/api/documentos-clientes", { params: query });
  return normalizePaginaDocumentosClientesFromApi(r.data);
}

export async function listarDocumentosPorCliente(
  clienteId: string,
  page = 0,
  size = 20
): Promise<PaginaDocumentosClientes> {
  const r = await api.get(`/api/clientes/${clienteId}/documentos`, { params: { page, size } });
  return normalizePaginaDocumentosClientesFromApi(r.data);
}

export async function obterDocumentoCliente(id: string): Promise<DocumentoCliente> {
  const r = await api.get(`/api/documentos-clientes/${id}`);
  return normalizeDocumentoClienteFromApi(r.data as Record<string, unknown>);
}

export async function obterResumoDocumentosClientes(): Promise<ResumoDocumentosClientes> {
  const r = await api.get("/api/documentos-clientes/resumo");
  return normalizeResumoDocumentosClientesFromApi(r.data);
}

/** Contagem para o badge: documentos novos (ENVIADO) aguardando confirmação do escritório. */
export async function obterContagemDocumentosNovos(): Promise<number> {
  const r = await api.get("/api/documentos-clientes/resumo");
  const raw = (r.data ?? {}) as Record<string, unknown>;
  const resumo = normalizeResumoDocumentosClientesFromApi(r.data);
  if (raw.pendentes != null || raw.novos != null) {
    return resumo.pendentes;
  }
  const lista = await listarDocumentosClientes({ status: "ENVIADO", page: 0, size: 1 });
  return lista.totalElements;
}

/** Dispara atualização do badge na sidebar após triagem de documentos. */
export const DOCUMENTOS_CLIENTES_RESUMO_INVALIDATE_EVENT = "documentos-clientes-resumo-invalidate";

export function invalidateDocumentosClientesResumo(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DOCUMENTOS_CLIENTES_RESUMO_INVALIDATE_EVENT));
  }
}

export async function atualizarStatusDocumento(id: string, status: StatusDocumentoCliente): Promise<DocumentoCliente> {
  const r = await api.patch(`/api/documentos-clientes/${id}/status`, { status });
  const data = r.data as Record<string, unknown>;
  if (data && (data.documentoId != null || data.id != null)) {
    return normalizeDocumentoClienteFromApi(data);
  }
  return obterDocumentoCliente(id);
}

export async function responderDocumento(id: string, resposta: string): Promise<DocumentoCliente> {
  const r = await api.patch(`/api/documentos-clientes/${id}/resposta`, { resposta: resposta.trim() });
  const data = r.data as Record<string, unknown>;
  if (data && (data.documentoId != null || data.id != null)) {
    return normalizeDocumentoClienteFromApi(data);
  }
  return obterDocumentoCliente(id);
}

export async function baixarArquivoDocumento(id: string, nomeArquivo?: string): Promise<void> {
  const path = `/api/documentos-clientes/${id}/arquivo`;
  let blob: Blob;
  if (isMockEnabled()) {
    const r = await api.get(path, { responseType: "blob" });
    blob = r.data as Blob;
  } else {
    const res = await fetchAutenticado(path);
    if (!res.ok) throw new Error("Não foi possível baixar o arquivo.");
    blob = await res.blob();
  }
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = nomeArquivo ?? `documento-${id}`;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

export async function abrirArquivoDocumento(id: string): Promise<void> {
  const path = `/api/documentos-clientes/${id}/arquivo`;
  let blob: Blob;
  if (isMockEnabled()) {
    const r = await api.get(path, { responseType: "blob" });
    blob = r.data as Blob;
  } else {
    const res = await fetchAutenticado(path);
    if (!res.ok) throw new Error("Não foi possível abrir o arquivo.");
    blob = await res.blob();
  }
  const blobUrl = URL.createObjectURL(blob);
  const janela = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!janela) {
    URL.revokeObjectURL(blobUrl);
    throw new Error("Permita pop-ups para visualizar o arquivo.");
  }
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
