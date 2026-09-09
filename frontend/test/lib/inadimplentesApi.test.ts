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
    isMockEnabled: vi.fn(() => false),
  };
});

import { api, isMockEnabled } from "@/lib/api";
import {
  listarInadimplentes,
  fetchAllInadimplentes,
  criarInadimplencia,
  confirmarPagamentoTotal,
  cancelarInadimplencia,
  registrarPagamento,
  listarPagamentosDivida,
  listarPagamentosPorQuery,
  obterConfigJuros,
  salvarConfigJuros,
  enviarAvisoPendencia,
} from "@/lib/inadimplentesApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

describe("inadimplentesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isMockEnabled).mockReturnValue(false);
  });

  it("lista array direto e páginas", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      ok([{ id: "d1", clienteId: "c1", valor: 10, vencimento: "2026-01-01" }]),
    );
    expect((await listarInadimplentes())[0].id).toBe("d1");

    vi.mocked(api.get)
      .mockResolvedValueOnce(
        ok({
          content: [{ id: "d1", clienteId: "c1", valor: 10, vencimento: "2026-01-01" }],
          totalPages: 2,
          size: 1,
          last: false,
        }),
      )
      .mockResolvedValueOnce(
        ok({
          content: [{ id: "d2", clienteId: "c1", valor: 20, vencimento: "2026-02-01" }],
          totalPages: 2,
          last: true,
        }),
      );
    expect(await fetchAllInadimplentes()).toHaveLength(2);

    vi.mocked(api.get).mockResolvedValueOnce(ok({ items: [] }));
    expect(await fetchAllInadimplentes()).toEqual([]);
  });

  it("cria, confirma, cancela e registra pagamento", async () => {
    vi.mocked(api.post).mockResolvedValue(ok({}));
    vi.mocked(api.patch).mockResolvedValue(ok({}));
    vi.mocked(api.delete).mockResolvedValue(ok({}));
    vi.mocked(api.put).mockResolvedValue(ok({}));
    await criarInadimplencia({ clienteId: "c1", valor: 100, vencimento: "2026-01-01" });
    vi.mocked(isMockEnabled).mockReturnValue(true);
    await criarInadimplencia({ clienteId: "c1", valor: 100, vencimento: "2026-01-01" });
    vi.mocked(isMockEnabled).mockReturnValue(false);
    await confirmarPagamentoTotal("d1", {
      desconto: 0,
      metodoPagamento: "PIX",
      dataPagamento: "2026-01-02",
    });
    await cancelarInadimplencia("d1");
    await registrarPagamento({
      dividaId: "d1",
      valorPago: 10000,
      dataPagamento: "2026-01-02",
      metodoPagamento: "PIX",
    });
    vi.mocked(api.get).mockResolvedValueOnce(
      ok([{ pagamentoId: "p1", valorPago: 100, dataPagamento: "2026-01-02" }]),
    );
    expect((await listarPagamentosDivida("d1"))[0].pagamentoId).toBe("p1");
    vi.mocked(api.get).mockResolvedValueOnce(ok([]));
    expect(await listarPagamentosPorQuery("d1")).toEqual([]);
    vi.mocked(api.get).mockResolvedValueOnce(ok(null));
    expect(await obterConfigJuros()).toEqual({});
    await salvarConfigJuros({ multaDiaria: 0.02, capMultaPercentual: 0.2, jurosMensal: 0.01 });
    vi.mocked(api.post).mockResolvedValueOnce(ok({ statusEnvio: "ENVIADO" }));
    expect(await enviarAvisoPendencia("c1", new Blob(["x"]), "aviso.pdf")).toMatchObject({
      statusEnvio: "ENVIADO",
    });
  });
});
