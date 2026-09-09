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
    },
  };
});

import { api } from "@/lib/api";
import {
  normalizeServicoFromApi,
  listarServicos,
  listarTodosServicos,
  criarServico,
  atualizarServico,
} from "@/lib/servicosApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

describe("servicosApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normaliza serviço e lista ativos/todos", async () => {
    const s = normalizeServicoFromApi({
      servicoId: 1,
      nome: "Balanço",
      valorPadrao: "10",
      ativo: false,
    });
    expect(s.servicoId).toBe("1");
    expect(s.valorPadrao).toBe(10);
    expect(s.ativo).toBe(false);
    expect(normalizeServicoFromApi({ nome: "X" }).valorPadrao).toBeNull();

    vi.mocked(api.get).mockResolvedValueOnce(ok([{ servicoId: "s1", nome: "A" }]));
    expect((await listarServicos())[0].nome).toBe("A");

    vi.mocked(api.get).mockResolvedValueOnce(ok([{ servicoId: "s2", nome: "B" }]));
    expect((await listarTodosServicos())[0].nome).toBe("B");

    vi.mocked(api.get)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce(ok([{ servicoId: "s3", nome: "C" }]));
    expect((await listarTodosServicos())[0].nome).toBe("C");

    vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 500 } });
    await expect(listarTodosServicos()).rejects.toMatchObject({ response: { status: 500 } });

    vi.mocked(api.post).mockResolvedValueOnce(ok({}));
    await criarServico({ nome: "Novo", ativo: true });
    vi.mocked(api.put).mockResolvedValueOnce(ok({}));
    await atualizarServico("s1", { nome: "Novo", ativo: false, valorPadrao: 1 });
  });
});
