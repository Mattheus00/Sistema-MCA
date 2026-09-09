import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";
import type { Cliente } from "@/types/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
    isMockEnabled: vi.fn(() => false),
  };
});

import { api, isMockEnabled } from "@/lib/api";
import {
  listarClientesPagina,
  listarClientes,
  listarTodosClientes,
  obterCliente,
  criarCliente,
  atualizarCliente,
  excluirCliente,
} from "@/lib/clientesApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

const cliente: Cliente = { nome: "Ana", email: "a@test.com" };

describe("clientesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isMockEnabled).mockReturnValue(false);
  });

  it("lista páginas e todos os clientes", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      ok({
        content: [{ id: "c1", nome: "Ana", statusCliente: "ATIVO" }],
        totalPages: 1,
        last: true,
      }),
    );
    const pagina = await listarClientesPagina({ page: 0, busca: "ana", termo: "" });
    expect(pagina.content[0].nome).toBe("Ana");
    expect(pagina.last).toBe(true);

    vi.mocked(api.get).mockResolvedValueOnce(
      ok({ content: [{ id: "c1", nome: "Ana" }], totalPages: 1, last: true }),
    );
    expect((await listarClientes({ statusCliente: "ATIVO" }))[0].id).toBe("c1");

    vi.mocked(api.get)
      .mockResolvedValueOnce(
        ok({
          content: [{ id: "c1", nome: "A" }],
          totalPages: 2,
          last: false,
          size: 200,
        }),
      )
      .mockResolvedValueOnce(
        ok({ content: [{ id: "c2", nome: "B" }], totalPages: 2, last: true, size: 200 }),
      );
    const todos = await listarTodosClientes("a", "ATIVO");
    expect(todos).toHaveLength(2);

    vi.mocked(api.get).mockResolvedValueOnce(ok([{ id: "c9", nome: "Array" }]));
    expect((await listarTodosClientes(undefined, "ATIVO"))[0].nome).toBe("Array");
  });

  it("obtém, cria, atualiza e exclui", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(ok({ id: "c1", nome: "Ana" }));
    expect((await obterCliente("c1")).nome).toBe("Ana");
    vi.mocked(api.get).mockResolvedValueOnce(ok(undefined));
    expect((await obterCliente("c2")).nome).toBe("");

    vi.mocked(api.post).mockResolvedValueOnce(ok({ id: "c3", nome: "Nova" }));
    expect((await criarCliente(cliente)).id).toBe("c3");

    vi.mocked(isMockEnabled).mockReturnValue(true);
    vi.mocked(api.post).mockResolvedValueOnce(ok({ id: "c4", nome: "Mock" }));
    await criarCliente({ ...cliente, codigo: " 4 ", cpf: " 123 ", celular: "(31) 99999-0000" });
    const body = vi.mocked(api.post).mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(body.codigo).toBe("4");

    vi.mocked(isMockEnabled).mockReturnValue(false);
    vi.mocked(api.patch).mockResolvedValueOnce(ok({}));
    await atualizarCliente("c1", cliente);
    vi.mocked(api.delete).mockResolvedValueOnce(ok({}));
    await excluirCliente("c1");
  });
});
