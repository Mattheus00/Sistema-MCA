import type { PortalLoginResponse } from "@/types/api";

export const PORTAL_TOKEN_KEY = "sgi_portal_token";
export const PORTAL_CLIENT_NAME_KEY = "sgi_portal_client_name";
export const PORTAL_CLIENT_ID_KEY = "sgi_portal_client_id";

export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PORTAL_TOKEN_KEY) ?? sessionStorage.getItem(PORTAL_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getPortalClientName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PORTAL_CLIENT_NAME_KEY) ?? sessionStorage.getItem(PORTAL_CLIENT_NAME_KEY);
  } catch {
    return null;
  }
}

export function getPortalClientId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PORTAL_CLIENT_ID_KEY) ?? sessionStorage.getItem(PORTAL_CLIENT_ID_KEY);
  } catch {
    return null;
  }
}

export function setPortalSession(data: PortalLoginResponse, manterConectado = true): void {
  clearPortalSession();
  const storage = manterConectado ? localStorage : sessionStorage;
  storage.setItem(PORTAL_TOKEN_KEY, data.token);
  const nome = data.clienteNome ?? data.nome ?? "Cliente";
  storage.setItem(PORTAL_CLIENT_NAME_KEY, nome);
  if (data.clienteId) storage.setItem(PORTAL_CLIENT_ID_KEY, data.clienteId);
}

export function clearPortalSession(): void {
  if (typeof window === "undefined") return;
  for (const key of [PORTAL_TOKEN_KEY, PORTAL_CLIENT_NAME_KEY, PORTAL_CLIENT_ID_KEY]) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}
