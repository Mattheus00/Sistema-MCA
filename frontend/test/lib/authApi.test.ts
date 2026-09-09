import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

import { api } from "@/lib/api";
import { login, registrar, validarLoginRecuperacao, redefinirSenha } from "@/lib/authApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

describe("authApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chama endpoints de autenticação", async () => {
    vi.mocked(api.post).mockResolvedValueOnce(ok({ token: "abc", perfil: "PROPRIETARIA" }));
    expect(await login({ login: "ana", senha: "x" })).toMatchObject({ token: "abc" });
    expect(vi.mocked(api.post).mock.calls[0][0]).toBe("/api/auth/login");

    vi.mocked(api.post).mockResolvedValueOnce(ok(undefined));
    await registrar({ nome: "Ana", login: "ana", senha: "123456" });
    expect(vi.mocked(api.post).mock.calls[1][0]).toBe("/api/auth/register");

    vi.mocked(api.post).mockResolvedValueOnce(ok({ encontrado: true, login: "ana" }));
    expect(await validarLoginRecuperacao("ana")).toMatchObject({ encontrado: true });

    vi.mocked(api.post).mockResolvedValueOnce(ok(undefined));
    await redefinirSenha({ login: "ana", novaSenha: "n", confirmarSenha: "n" });
    expect(vi.mocked(api.post).mock.calls[3][0]).toBe("/api/auth/redefinir-senha");
  });
});
