import { describe, it, expect } from "vitest";
import {
  clearAuthSession,
  getApiErrorMessage,
  getAuthToken,
  getRelatorioErrorMessage,
  isRememberMePreferred,
  normalizeListResponse,
  setAuthSession,
  AUTH_TOKEN_KEY,
  USER_DISPLAY_KEY,
  USER_LOGIN_KEY,
  USER_PROFILE_KEY,
} from "@/lib/api";
import type { AxiosError } from "axios";
import type { ApiErrorBody } from "@/types/api";

describe("getApiErrorMessage", () => {
  it("retorna fallback quando error é null ou não objeto", () => {
    expect(getApiErrorMessage(null, "Fallback")).toBe("Fallback");
    expect(getApiErrorMessage(undefined, "Outro")).toBe("Outro");
    expect(getApiErrorMessage("string", "F")).toBe("F");
  });

  it("retorna data.message quando presente", () => {
    const err = {
      response: { data: { message: "Cliente não encontrado" } },
    } as AxiosError<ApiErrorBody>;
    expect(getApiErrorMessage(err, "Fallback")).toBe("Cliente não encontrado");
  });

  it("retorna data.error quando message não existe", () => {
    const err = {
      response: { data: { error: "Unauthorized" } },
    } as AxiosError<ApiErrorBody>;
    expect(getApiErrorMessage(err, "Fallback")).toBe("Unauthorized");
  });

  it("retorna primeiro item de data.errors quando array", () => {
    const err = {
      response: {
        data: { errors: [{ message: "Campo inválido" }] },
      },
    } as AxiosError<ApiErrorBody>;
    expect(getApiErrorMessage(err, "Fallback")).toBe("Campo inválido");
  });

  it("retorna mensagem de timeout quando code ECONNABORTED", () => {
    const err = { code: "ECONNABORTED" } as AxiosError<ApiErrorBody>;
    expect(getApiErrorMessage(err, "Fallback")).toContain("Tempo esgotado");
  });

  it("retorna mensagem de timeout quando message inclui 'timeout'", () => {
    const err = { message: "timeout of 20000ms exceeded" } as AxiosError<ApiErrorBody>;
    expect(getApiErrorMessage(err, "Fallback")).toContain("Tempo esgotado");
  });

  it("retorna mensagem de rede quando Network Error", () => {
    const err = { message: "Network Error" } as AxiosError<ApiErrorBody>;
    expect(getApiErrorMessage(err, "Fallback")).toContain("conexão");
  });

  it("retorna Error.message genérico quando nada específico", () => {
    const err = new Error("Algo falhou");
    expect(getApiErrorMessage(err, "Fallback")).toBe("Algo falhou");
  });
});

describe("getRelatorioErrorMessage", () => {
  it("retorna mensagem de relatório indisponível para 404", () => {
    const err = { response: { status: 404 } } as AxiosError<ApiErrorBody>;
    expect(getRelatorioErrorMessage(err, "Fallback")).toContain("não está disponível");
  });

  it("retorna mensagem de relatório indisponível para 501", () => {
    const err = { response: { status: 501 } } as AxiosError<ApiErrorBody>;
    expect(getRelatorioErrorMessage(err, "Fallback")).toContain("não está disponível");
  });

  it("delega para getApiErrorMessage em outros status", () => {
    const err = {
      response: { status: 500, data: { message: "Erro interno" } },
    } as AxiosError<ApiErrorBody>;
    expect(getRelatorioErrorMessage(err, "Fallback")).toBe("Erro interno");
  });
});

describe("normalizeListResponse", () => {
  it("retorna o array quando data já é array", () => {
    const arr = [{ id: 1 }, { id: 2 }];
    expect(normalizeListResponse(arr)).toEqual(arr);
  });

  it("retorna content quando data é objeto com content", () => {
    const content = [{ a: 1 }];
    expect(normalizeListResponse({ content })).toEqual(content);
  });

  it("retorna array vazio quando data não é array nem content", () => {
    expect(normalizeListResponse(null)).toEqual([]);
    expect(normalizeListResponse({})).toEqual([]);
    expect(normalizeListResponse({ items: [] })).toEqual([]);
  });
});

describe("auth session helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("salva sessão em localStorage quando manter conectado", () => {
    setAuthSession(
      { token: "t1", display: "João", login: "joao", profile: "PROPRIETARIA" },
      true
    );
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("t1");
    expect(localStorage.getItem(USER_DISPLAY_KEY)).toBe("João");
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(getAuthToken()).toBe("t1");
    expect(isRememberMePreferred()).toBe(true);
  });

  it("salva sessão em sessionStorage quando não manter conectado", () => {
    setAuthSession({ token: "t2", display: "Maria", login: "maria" }, false);
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe("t2");
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(getAuthToken()).toBe("t2");
    expect(isRememberMePreferred()).toBe(false);
  });

  it("limpa auth dos dois storages", () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "a");
    sessionStorage.setItem(AUTH_TOKEN_KEY, "b");
    localStorage.setItem(USER_LOGIN_KEY, "x");
    sessionStorage.setItem(USER_PROFILE_KEY, "PROPRIETARIA");
    clearAuthSession();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_LOGIN_KEY)).toBeNull();
    expect(sessionStorage.getItem(USER_PROFILE_KEY)).toBeNull();
    expect(getAuthToken()).toBeNull();
  });

  it("prioriza sessionStorage ao ler token", () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "local");
    sessionStorage.setItem(AUTH_TOKEN_KEY, "session");
    expect(getAuthToken()).toBe("session");
  });
});
