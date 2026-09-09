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
  normalizeCobrancaSicoobFromApi,
  fetchSicoobStatus,
  gerarPixSicoob,
  gerarBoletoSicoob,
  listarCobrancasSicoob,
  obterCobrancaSicoob,
  valorCentavosParaReais,
  listarCobrancasPorDivida,
  getSicoobStatus,
} from "@/lib/sicoobApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

describe("sicoobApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normaliza cobrança e converte centavos", () => {
    const c = normalizeCobrancaSicoobFromApi({
      id: "c1",
      tipo: "pix",
      valorCentavos: "1500",
      pixTxid: "tx",
    });
    expect(c.cobrancaId).toBe("c1");
    expect(c.tipo).toBe("PIX");
    expect(c.valorCentavos).toBe(1500);
    expect(valorCentavosParaReais(1500)).toBe(15);
    expect(valorCentavosParaReais(Number.NaN)).toBe(0);
  });

  it("consulta status, gera e lista cobranças", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(ok({ enabled: true, mensagem: "ok" }));
    expect(await fetchSicoobStatus()).toMatchObject({ enabled: true, mensagem: "ok" });
    expect(getSicoobStatus).toBe(fetchSicoobStatus);

    vi.mocked(api.post).mockResolvedValueOnce(ok({ cobrancaId: "p1", tipo: "PIX" }));
    expect((await gerarPixSicoob("d1")).cobrancaId).toBe("p1");
    vi.mocked(api.post).mockResolvedValueOnce(ok({ cobrancaId: "b1", tipo: "BOLETO" }));
    expect((await gerarBoletoSicoob("d1")).tipo).toBe("BOLETO");
    vi.mocked(api.get).mockResolvedValueOnce(ok([{ cobrancaId: "c1" }]));
    expect((await listarCobrancasSicoob("d1"))[0].cobrancaId).toBe("c1");
    expect(listarCobrancasPorDivida).toBe(listarCobrancasSicoob);
    vi.mocked(api.get).mockResolvedValueOnce(ok({ cobrancaId: "c2" }));
    expect((await obterCobrancaSicoob("c2")).cobrancaId).toBe("c2");
  });

  it("envolve erros com mensagem", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("status"));
    await expect(fetchSicoobStatus()).rejects.toThrow("status");
    vi.mocked(api.post).mockRejectedValueOnce(new Error("pix"));
    await expect(gerarPixSicoob("d")).rejects.toThrow("pix");
    vi.mocked(api.post).mockRejectedValueOnce(new Error("bol"));
    await expect(gerarBoletoSicoob("d")).rejects.toThrow("bol");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("list"));
    await expect(listarCobrancasSicoob("d")).rejects.toThrow("list");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("get"));
    await expect(obterCobrancaSicoob("x")).rejects.toThrow("get");
  });
});
