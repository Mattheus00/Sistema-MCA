import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

import { api } from "@/lib/api";
import {
  calcularTributo,
  validarCreditoTributo,
  consultarRegimeCnpj,
  consultarIaTributos,
  calcularCashback,
} from "@/lib/tributosApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

describe("tributosApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chama endpoints do simulador", async () => {
    vi.mocked(api.post).mockResolvedValueOnce(ok({ valorTotal: 110 }));
    expect(
      await calcularTributo({ valor: 100, tipo: "POR_DENTRO", categoria: "PLENO" }),
    ).toMatchObject({ valorTotal: 110 });
    vi.mocked(api.post).mockResolvedValueOnce(ok({}));
    await validarCreditoTributo({ valorVenda: 100, valorCompras: 40, categoria: "PLENO" });
    vi.mocked(api.get).mockResolvedValueOnce(ok({ cnpj: "1", regime: "SIMPLES" }));
    expect(await consultarRegimeCnpj("123")).toMatchObject({ regime: "SIMPLES" });
    vi.mocked(api.post).mockResolvedValueOnce(ok({ sucesso: true, resposta: "ok" }));
    expect(await consultarIaTributos("o que é CBS?")).toMatchObject({ sucesso: true });
    vi.mocked(api.get).mockResolvedValueOnce(ok({ cashbackCBS: 5 }));
    expect(await calcularCashback(100, 5)).toMatchObject({ cashbackCBS: 5 });
  });
});
