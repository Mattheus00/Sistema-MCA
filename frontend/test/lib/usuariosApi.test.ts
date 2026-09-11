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
  listarUsuariosPendentes,
  listarUsuariosAtivos,
  aprovarUsuario,
  revogarUsuario,
  cadastrarUsuario,
} from "@/lib/usuariosApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

describe("usuariosApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista, aprova, revoga e cadastra", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(ok([{ id: "1", nome: "Ana", login: "ana" }]));
    expect((await listarUsuariosPendentes())[0].nome).toBe("Ana");
    vi.mocked(api.get).mockResolvedValueOnce(
      ok({ content: [{ usuarioId: "2", nome: "João", login: "joao" }] }),
    );
    expect((await listarUsuariosAtivos())[0]?.usuarioId).toBe("2");
    vi.mocked(api.patch).mockResolvedValue(ok({}));
    await aprovarUsuario("1", "FUNCIONARIO");
    expect(String(vi.mocked(api.patch).mock.calls[0][0])).toContain("aprovar");
    await revogarUsuario("2");
    vi.mocked(api.post).mockResolvedValueOnce(ok({}));
    await cadastrarUsuario({
      nome: "Novo",
      email: "novo@test.com",
      login: "novo",
      senha: "123456",
    });
  });
});
