import { api, getAuthToken, isMockEnabled } from "@/lib/api";
import {
  normalizeLoteEnvioBoletoFromApi,
  normalizeResultadoEnvioLoteFromApi,
  normalizeValidacaoLoteFromApi,
} from "@/lib/apiNormalizers";
import type { LoteEnvioBoleto, ResultadoEnvioLote } from "@/types/api";

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

export async function criarLoteEnvioBoletos(files: File[]): Promise<LoteEnvioBoleto> {
  const formData = new FormData();
  for (const arquivo of files) formData.append("arquivos", arquivo, arquivo.name);
  const r = await api.post("/api/lotes-envio-boletos", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120_000,
  });
  return normalizeLoteEnvioBoletoFromApi(r.data as Record<string, unknown>);
}

export async function consultarLoteEnvioBoletos(loteId: string): Promise<LoteEnvioBoleto> {
  const r = await api.get(`/api/lotes-envio-boletos/${loteId}`);
  return normalizeLoteEnvioBoletoFromApi(r.data as Record<string, unknown>);
}

export async function consultarResultadoEnvioLote(loteId: string): Promise<ResultadoEnvioLote> {
  const r = await api.get(`/api/lotes-envio-boletos/${loteId}/resultado-envio`);
  return normalizeResultadoEnvioLoteFromApi(r.data as Record<string, unknown>);
}

export async function atualizarClienteItem(
  loteId: string,
  itemId: string,
  clienteId: string
): Promise<LoteEnvioBoleto> {
  await api.patch(`/api/lotes-envio-boletos/${loteId}/itens/${itemId}/cliente`, { clienteId });
  return consultarLoteEnvioBoletos(loteId);
}

export async function confirmarItemEnvioBoleto(loteId: string, itemId: string): Promise<LoteEnvioBoleto> {
  await api.patch(`/api/lotes-envio-boletos/${loteId}/itens/${itemId}/confirmar`);
  return consultarLoteEnvioBoletos(loteId);
}

export async function ignorarItemEnvioBoleto(loteId: string, itemId: string): Promise<LoteEnvioBoleto> {
  await api.patch(`/api/lotes-envio-boletos/${loteId}/itens/${itemId}/ignorar`);
  return consultarLoteEnvioBoletos(loteId);
}

export async function validarLoteEnvioBoletos(loteId: string): Promise<LoteEnvioBoleto> {
  const r = await api.post(`/api/lotes-envio-boletos/${loteId}/validar`);
  const data = r.data as Record<string, unknown>;
  if (data && (data.loteId != null || data.id != null || Array.isArray(data.itens))) {
    return normalizeLoteEnvioBoletoFromApi(data);
  }
  const validacao = normalizeValidacaoLoteFromApi(data) ?? { podeEnviar: false, bloqueios: [] };
  const atual = await consultarLoteEnvioBoletos(loteId);
  return { ...atual, validacao };
}

export async function enviarLoteEnvioBoletos(
  loteId: string,
  opcoes?: { permitirReenvioDuplicado?: boolean; itemIds?: string[] }
): Promise<LoteEnvioBoleto> {
  const body: { permitirReenvioDuplicado?: boolean; itemIds?: string[] } = {};
  if (opcoes?.permitirReenvioDuplicado) body.permitirReenvioDuplicado = true;
  if (opcoes?.itemIds && opcoes.itemIds.length > 0) body.itemIds = opcoes.itemIds;
  await api.post(`/api/lotes-envio-boletos/${loteId}/enviar`, body);
  return consultarLoteEnvioBoletos(loteId);
}

export async function baixarPdfItem(loteId: string, itemId: string): Promise<Blob> {
  const path = `/api/lotes-envio-boletos/${loteId}/itens/${itemId}/arquivo`;
  if (isMockEnabled()) {
    const r = await api.get(path, { responseType: "blob" });
    return r.data as Blob;
  }
  const res = await fetchAutenticado(path);
  if (!res.ok) throw new Error("Não foi possível abrir o PDF.");
  return res.blob();
}

export async function abrirPdfItem(loteId: string, itemId: string): Promise<void> {
  const blob = await baixarPdfItem(loteId, itemId);
  const blobUrl = URL.createObjectURL(blob);
  const janela = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!janela) {
    URL.revokeObjectURL(blobUrl);
    throw new Error("Permita pop-ups para visualizar o PDF.");
  }
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export async function baixarRelatorioCsv(loteId: string): Promise<void> {
  const path = `/api/lotes-envio-boletos/${loteId}/relatorio.csv`;
  let blob: Blob;
  if (isMockEnabled()) {
    const r = await api.get(path, { responseType: "blob" });
    blob = r.data as Blob;
  } else {
    const res = await fetchAutenticado(path);
    if (!res.ok) throw new Error("Não foi possível baixar o relatório.");
    blob = await res.blob();
  }
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `relatorio-envio-boletos-${loteId}.csv`;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
