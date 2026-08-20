import axios, { type AxiosError } from "axios";
import { getApiErrorMessage, isMockEnabled } from "@/lib/api";
import { api } from "@/lib/api";
import {
  normalizeDocumentoPortalFromApi,
  normalizePaginaDocumentosPortalFromApi,
} from "@/lib/apiNormalizers";
import {
  clearPortalSession,
  getPortalToken,
  setPortalSession,
} from "@/lib/portalSession";
import type {
  PortalDivida,
  PortalDividaDetalhe,
  PortalDocumento,
  PortalExtrato,
  PortalLoginResponse,
  PortalResumo,
  TipoDocumentoCliente,
} from "@/types/api";

const baseURL =
  import.meta.env.VITE_API_URL !== undefined && String(import.meta.env.VITE_API_URL).trim() !== ""
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, "")
    : "http://localhost:8080";

const portalAxios = axios.create({
  baseURL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

if (!isMockEnabled()) {
  portalAxios.interceptors.request.use((config) => {
    const token = getPortalToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  portalAxios.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) clearPortalSession();
      return Promise.reject(error);
    }
  );
}

const http = isMockEnabled() ? api : portalAxios;

function normalizeResumo(data: unknown): PortalResumo {
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    saldoDevedorTotal: Number(raw.saldoDevedorTotal ?? raw.saldoDevedor ?? raw.totalEmAberto ?? 0),
    quantidadeDividasAbertas: Number(raw.quantidadeDividasAbertas ?? raw.dividasAbertas ?? raw.totalDividasAbertas ?? 0),
    quantidadeDividasVencidas: Number(raw.quantidadeDividasVencidas ?? raw.dividasVencidas ?? 0),
    clienteNome: raw.clienteNome != null ? String(raw.clienteNome) : undefined,
  };
}

function normalizeDivida(raw: Record<string, unknown>): PortalDivida {
  return {
    id: String(raw.id ?? raw.dividaId ?? ""),
    protocolo: raw.protocolo != null ? String(raw.protocolo) : undefined,
    descricao: raw.descricao != null ? String(raw.descricao) : undefined,
    vencimento: raw.vencimento != null ? String(raw.vencimento) : raw.dataVencimento != null ? String(raw.dataVencimento) : undefined,
    valorDevedor: Number(raw.valorDevedor ?? raw.valor ?? raw.saldoDevedor ?? 0),
    valor: raw.valor != null ? Number(raw.valor) : undefined,
    status: raw.status != null ? String(raw.status) : undefined,
    diasAtraso: raw.diasAtraso != null ? Number(raw.diasAtraso) : undefined,
  };
}

function normalizeDividaDetalhe(data: unknown): PortalDividaDetalhe {
  const raw = (data ?? {}) as Record<string, unknown>;
  const base = normalizeDivida(raw);
  const pagamentosRaw = Array.isArray(raw.pagamentos) ? raw.pagamentos : [];
  return {
    ...base,
    valorOriginal: raw.valorOriginal != null ? Number(raw.valorOriginal) : undefined,
    juros: raw.juros != null ? Number(raw.juros) : undefined,
    pagamentos: pagamentosRaw.map((p) => {
      const item = p as Record<string, unknown>;
      return {
        id: item.id != null ? String(item.id) : undefined,
        dataPagamento: item.dataPagamento != null ? String(item.dataPagamento) : undefined,
        valor: item.valor != null ? Number(item.valor) : undefined,
        metodo: item.metodo != null ? String(item.metodo) : undefined,
      };
    }),
  };
}

export async function loginPortal(cpfCnpj: string, senha: string): Promise<PortalLoginResponse> {
  const r = await http.post("/api/portal/auth/login", {
    cpfCnpj: cpfCnpj.replace(/\D/g, ""),
    senha,
  });
  const data = r.data as PortalLoginResponse;
  setPortalSession(data);
  return data;
}

export async function ativarPortal(
  cpfCnpj: string,
  email: string,
  senha: string,
  confirmarSenha: string
): Promise<PortalLoginResponse> {
  const r = await http.post("/api/portal/auth/ativar", {
    cpfCnpj: cpfCnpj.replace(/\D/g, ""),
    email: email.trim(),
    senha,
    confirmarSenha,
  });
  const data = r.data as PortalLoginResponse;
  setPortalSession(data);
  return data;
}

export function logoutPortal(): void {
  clearPortalSession();
}

export async function fetchPortalResumo(): Promise<PortalResumo> {
  const r = await http.get("/api/portal/resumo");
  return normalizeResumo(r.data);
}

export async function fetchPortalDividas(status = "abertas"): Promise<PortalDivida[]> {
  const r = await http.get("/api/portal/dividas", { params: { status } });
  const list = Array.isArray(r.data) ? r.data : Array.isArray((r.data as { content?: unknown[] })?.content) ? (r.data as { content: unknown[] }).content : [];
  return (list as Record<string, unknown>[]).map(normalizeDivida);
}

export async function fetchPortalDivida(id: string): Promise<PortalDividaDetalhe> {
  const r = await http.get(`/api/portal/dividas/${id}`);
  return normalizeDividaDetalhe(r.data);
}

export async function fetchPortalExtrato(): Promise<PortalExtrato> {
  const r = await http.get("/api/portal/extrato");
  const raw = (r.data ?? {}) as Record<string, unknown>;
  const movimentacoes = Array.isArray(raw.movimentacoes) ? raw.movimentacoes : [];
  return {
    movimentacoes: movimentacoes.map((m) => {
      const item = m as Record<string, unknown>;
      return {
        data: String(item.data ?? ""),
        descricao: String(item.descricao ?? ""),
        valor: Number(item.valor ?? 0),
        tipo: String(item.tipo ?? ""),
      };
    }),
  };
}

export async function listarDocumentos(page = 0, size = 20): Promise<PortalDocumento[]> {
  const r = await http.get("/api/portal/documentos", { params: { page, size } });
  return normalizePaginaDocumentosPortalFromApi(r.data);
}

export async function uploadDocumento(params: {
  arquivo: File;
  tipo: TipoDocumentoCliente;
  dividaId?: string;
  observacao?: string;
}): Promise<PortalDocumento> {
  const formData = new FormData();
  formData.append("arquivo", params.arquivo, params.arquivo.name);
  formData.append("tipo", params.tipo);
  if (params.dividaId) formData.append("dividaId", params.dividaId);
  if (params.observacao?.trim()) formData.append("observacao", params.observacao.trim());
  const r = await http.post("/api/portal/documentos", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120_000,
  });
  return normalizeDocumentoPortalFromApi(r.data as Record<string, unknown>);
}

export function downloadDocumentoUrl(id: string): string {
  const base = isMockEnabled() ? "" : baseURL;
  return `${base}/api/portal/documentos/${id}/download`;
}

export async function baixarDocumento(id: string, nomeArquivo?: string): Promise<void> {
  const path = `/api/portal/documentos/${id}/download`;
  if (isMockEnabled()) {
    const r = await api.get(path, { responseType: "blob" });
    const blob = r.data as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo ?? `documento-${id}`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const token = getPortalToken();
  const res = await fetch(`${baseURL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Não foi possível baixar o documento.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo ?? `documento-${id}`;
  a.click();
  URL.revokeObjectURL(url);
}

export { getApiErrorMessage };
