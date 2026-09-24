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
  solicitarRecuperacaoSenha,
  redefinirSenhaComToken,
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

    vi.mocked(api.post).mockResolvedValueOnce(
      ok({
        mensagem: "Se o login existir e tiver e-mail cadastrado, você receberá as instruções.",
      }),
    );
    await solicitarRecuperacaoSenha("ana");
    expect(vi.mocked(api.post).mock.calls[2][0]).toBe("/api/auth/recuperar-senha/solicitar");
    expect(vi.mocked(api.post).mock.calls[2][1]).toEqual({ login: "ana" });

    vi.mocked(api.post).mockResolvedValueOnce(ok({ mensagem: "Senha alterada com sucesso." }));
    await redefinirSenhaComToken({ token: "abc", novaSenha: "n", confirmarSenha: "n" });
    expect(vi.mocked(api.post).mock.calls[3][0]).toBe("/api/auth/recuperar-senha/redefinir");
    expect(vi.mocked(api.post).mock.calls[3][1]).toEqual({
      token: "abc",
      novaSenha: "n",
      confirmarSenha: "n",
    });

    vi.mocked(api.get).mockResolvedValueOnce(
      ok({ usuarioId: "u-1", login: "ana", nome: "Ana", perfil: "PROPRIETARIA" }),
    );
    expect(await obterUsuarioLogado()).toMatchObject({ usuarioId: "u-1" });
    expect(vi.mocked(api.get).mock.calls[0][0]).toBe("/api/auth/me");
  });
});
