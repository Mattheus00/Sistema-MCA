import axios, { type AxiosError } from "axios";
import type { ApiErrorBody, Inadimplencia, PerfilUsuario } from "@/types/api";
import { normalizeInadimplenciaFromApi } from "@/lib/apiNormalizers";
import { createMockClient, isMockEnabled } from "./mockApi";

export { isMockEnabled } from "./mockApi";

/** URL base do backend. Evita requisições irem para o servidor do front (Vite). */
const baseURL =
  import.meta.env.VITE_API_URL !== undefined && String(import.meta.env.VITE_API_URL).trim() !== ""
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, "")
    : "http://localhost:8080";

const axiosInstance = axios.create({
  baseURL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

/** Em modo mock (VITE_USE_MOCK=true) usa dados em memória; senão usa o backend real */
export const api = isMockEnabled()
  ? (createMockClient() as typeof axiosInstance)
  : axiosInstance;

/** Chave onde o token de autenticação é guardado (quando o backend exigir) */
export const AUTH_TOKEN_KEY = "sgi_token";

/** Chave onde o login/nome do usuário é guardado para exibir na sidebar */
export const USER_DISPLAY_KEY = "sgi_user_display";
/** Login do usuário autenticado (para comparação com a API, ex.: revogar) */
export const USER_LOGIN_KEY = "sgi_user_login";
/** Chave onde o perfil do usuário autenticado é guardado */
export const USER_PROFILE_KEY = "sgi_user_profile";
/** Preferência do checkbox "Manter conectado" (sempre em localStorage) */
export const REMEMBER_ME_KEY = "sgi_remember_me";

const AUTH_SESSION_KEYS = [AUTH_TOKEN_KEY, USER_DISPLAY_KEY, USER_LOGIN_KEY, USER_PROFILE_KEY] as const;

export type AuthSessionData = {
  token: string;
  display: string;
  login: string;
  profile?: PerfilUsuario | null;
};

function browserStorage(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Limpa token e dados do usuário em localStorage e sessionStorage. */
export function clearAuthSession(): void {
  const local = browserStorage("local");
  const session = browserStorage("session");
  for (const key of AUTH_SESSION_KEYS) {
    local?.removeItem(key);
    session?.removeItem(key);
  }
  local?.removeItem(REMEMBER_ME_KEY);
}

/**
 * Retorna o storage ativo da sessão.
 * Prioriza sessionStorage (sessão da aba) e depois localStorage (manter conectado).
 */
export function getAuthStorage(): Storage {
  const local = browserStorage("local");
  const session = browserStorage("session");
  if (session?.getItem(AUTH_TOKEN_KEY)) return session;
  if (local?.getItem(AUTH_TOKEN_KEY)) return local;
  return local ?? session ?? localStorage;
}

export function getAuthToken(): string | null {
  const session = browserStorage("session");
  const local = browserStorage("local");
  if (session?.getItem(AUTH_TOKEN_KEY)) return session.getItem(AUTH_TOKEN_KEY);
  return local?.getItem(AUTH_TOKEN_KEY) ?? null;
}

export function getAuthUserDisplay(): string | null {
  return getAuthStorage().getItem(USER_DISPLAY_KEY);
}

export function getAuthUserLogin(): string | null {
  return getAuthStorage().getItem(USER_LOGIN_KEY);
}

export function getAuthUserProfile(): string | null {
  return getAuthStorage().getItem(USER_PROFILE_KEY);
}

/** Padrão do checkbox: marcado (comportamento anterior do app). */
export function isRememberMePreferred(): boolean {
  const local = browserStorage("local");
  if (!local) return true;
  return local.getItem(REMEMBER_ME_KEY) !== "0";
}

/** Persiste sessão no storage escolhido e remove dados do outro (evita token fantasma). */
export function setAuthSession(data: AuthSessionData, manterConectado: boolean): void {
  clearAuthSession();
  const storage = manterConectado ? browserStorage("local") : browserStorage("session");
  if (!storage) return;
  storage.setItem(AUTH_TOKEN_KEY, data.token);
  storage.setItem(USER_DISPLAY_KEY, data.display);
  storage.setItem(USER_LOGIN_KEY, data.login);
  if (data.profile) storage.setItem(USER_PROFILE_KEY, data.profile);
  browserStorage("local")?.setItem(REMEMBER_ME_KEY, manterConectado ? "1" : "0");
}

/** Prefixo gravado em `comprovante` para persistir quem confirmou (DTO do backend não tem esse campo). */
export const CONFIRMADO_POR_COMPROVANTE_PREFIX = "user:";

/** Nome/login do usuário autenticado para exibição e auditoria de pagamento. */
export function getUsuarioLogadoLabel(): string {
  if (typeof window === "undefined") return "";
  if (!getAuthToken()) return "";
  const storage = getAuthStorage();
  return (storage.getItem(USER_DISPLAY_KEY) || storage.getItem(USER_LOGIN_KEY) || "").trim();
}

export function encodeConfirmadoPorComprovante(label: string): string {
  return `${CONFIRMADO_POR_COMPROVANTE_PREFIX}${label.trim()}`;
}

export function decodeConfirmadoPorComprovante(comprovante: string | null | undefined): string | undefined {
  if (!comprovante) return undefined;
  const s = comprovante.trim();
  if (!s.toLowerCase().startsWith(CONFIRMADO_POR_COMPROVANTE_PREFIX)) return undefined;
  const nome = s.slice(CONFIRMADO_POR_COMPROVANTE_PREFIX.length).trim();
  return nome || undefined;
}

if (!isMockEnabled()) {
  axiosInstance.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorBody>) => {
      if (error.response?.status === 401) {
        clearAuthSession();
      }
      return Promise.reject(error);
    }
  );
}

/**
 * Extrai mensagem de erro amigável a partir da resposta da API ou do erro de rede.
 * Ajuste conforme o formato de erro do backend.
 */
const MSG_RELATORIO_INDISPONIVEL = "Este relatório ainda não está disponível no servidor.";

export function getApiErrorMessage(error: unknown, fallback = "Ocorreu um erro. Tente novamente."): string {
  if (!error || typeof error !== "object") return fallback;
  const ax = error as AxiosError<ApiErrorBody>;
  const data = ax.response?.data;
  if (data) {
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (typeof data.error === "string" && data.error.trim()) return data.error;
    if (Array.isArray(data.errors) && data.errors[0]?.message) return data.errors[0].message;
  }
  if (ax.code === "ECONNABORTED" || ax.message?.includes("timeout")) return "Tempo esgotado. Verifique sua conexão.";
  if (ax.message === "Network Error") return "Erro de conexão. Verifique se o backend está em execução.";
  if (typeof (error as Error).message === "string" && (error as Error).message) return (error as Error).message;
  return fallback;
}

/** Retorna mensagem amigável quando o endpoint não existe (404/501). */
export function getRelatorioErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const status = (error as AxiosError<ApiErrorBody>).response?.status;
    if (status === 404 || status === 501) return MSG_RELATORIO_INDISPONIVEL;
  }
  return getApiErrorMessage(error, fallback);
}

/**
 * Garante que a resposta é um array (content paginado ou array direto).
 */
export function normalizeListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "content" in data && Array.isArray((data as { content: T[] }).content)) {
    return (data as { content: T[] }).content;
  }
  return [];
}

function mapInadimplenciaResponseItem(raw: Record<string, unknown>): Inadimplencia {
  return isMockEnabled() ? (raw as Inadimplencia) : normalizeInadimplenciaFromApi(raw);
}

/** Carrega todas as inadimplências, percorrendo páginas quando a API retorna PageResponse. */
export async function fetchAllInadimplentes(): Promise<Inadimplencia[]> {
  const first = await api.get("/api/inadimplentes", { params: { paginado: false } });
  const data = first.data;

  if (Array.isArray(data)) {
    return data.map((item) => mapInadimplenciaResponseItem(item as Record<string, unknown>));
  }

  if (data && typeof data === "object" && Array.isArray((data as { content?: unknown[] }).content)) {
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
      const chunk = Array.isArray(pageData.content) ? pageData.content.map(mapInadimplenciaResponseItem) : [];
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
