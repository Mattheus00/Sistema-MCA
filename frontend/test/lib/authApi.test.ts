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
import {
  login,
  obterUsuarioLogado,
  registrar,
  validarLoginRecuperacao,
  redefinirSenha,
  solicitarRedefinicao,
  confirmarRedefinicao,
} from "@/lib/authApi";

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
    await registrar({ nome: "Ana", login: "ana", email: "ana@sgi.local", senha: "123456" });
    expect(vi.mocked(api.post).mock.calls[1][0]).toBe("/api/auth/register");

    vi.mocked(api.post).mockResolvedValueOnce(ok({ encontrado: true, login: "ana" }));
    expect(await validarLoginRecuperacao("ana")).toMatchObject({ encontrado: true });

    vi.mocked(api.post).mockResolvedValueOnce(ok(undefined));
    await redefinirSenha({ login: "ana", novaSenha: "n", confirmarSenha: "n" });
    expect(vi.mocked(api.post).mock.calls[3][0]).toBe("/api/auth/redefinir-senha");

    vi.mocked(api.post).mockResolvedValueOnce(
      ok({ mensagem: "Se a conta tiver e-mail cadastrado." }),
    );
    await solicitarRedefinicao("ana");
    expect(vi.mocked(api.post).mock.calls[4][0]).toBe("/api/auth/solicitar-redefinicao");
    expect(vi.mocked(api.post).mock.calls[4][1]).toEqual({ login: "ana" });

    vi.mocked(api.post).mockResolvedValueOnce(ok({ mensagem: "Senha alterada com sucesso." }));
    await confirmarRedefinicao({ token: "abc", novaSenha: "n", confirmarSenha: "n" });
    expect(vi.mocked(api.post).mock.calls[5][0]).toBe("/api/auth/confirmar-redefinicao");

    vi.mocked(api.get).mockResolvedValueOnce(
      ok({ usuarioId: "u-1", login: "ana", nome: "Ana", perfil: "PROPRIETARIA" }),
    );
    expect(await obterUsuarioLogado()).toMatchObject({ usuarioId: "u-1" });
    expect(vi.mocked(api.get).mock.calls[0][0]).toBe("/api/auth/me");
  });
});
