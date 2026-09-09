import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
    },
    isMockEnabled: vi.fn(() => false),
  };
});

import { api, isMockEnabled } from "@/lib/api";
import {
  normalizeAgingFromApi,
  obterResumoRelatorio,
  obterResumoFinanceiro,
  obterAging,
  obterRankingDevedores,
  obterExtratoCliente,
  obterInadimplenciaPeriodo,
  obterPagamentosRecebidos,
  obterEfetividadeCobranca,
} from "@/lib/relatoriosApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

describe("relatoriosApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isMockEnabled).mockReturnValue(false);
  });

  it("normaliza aging com percentual derivado", () => {
    expect(normalizeAgingFromApi(null)).toBeNull();
    const aging = normalizeAgingFromApi({
      valorTotalGeral: 100,
      faixas: [{ faixa: "0-30", qtdDividas: 1, valorTotal: 40 }],
    });
    expect(aging?.faixas[0].percentual).toBe(40);
    const comPercentual = normalizeAgingFromApi({
      valorTotal: 10,
      faixas: [{ faixa: "31-60", quantidade: 2, valor: 5, percentual: 50 }],
    });
    expect(comPercentual?.faixas[0].percentual).toBe(50);
  });

  it("consulta relatórios com e sem cache bust", async () => {
    vi.mocked(api.get).mockResolvedValue(
      ok({ totalClientes: 1, totalDividas: 2, totalEmAberto: 3, totalPago: 0 }),
    );
    expect(await obterResumoRelatorio({ dias: 30, cacheBust: true })).toBeTruthy();
    expect(await obterResumoRelatorio()).toBeTruthy();
    expect(
      await obterResumoFinanceiro("2026-01-01", "2026-01-31", { cacheBust: true }),
    ).toBeTruthy();
    vi.mocked(api.get).mockResolvedValueOnce(ok({ faixas: [] }));
    expect(await obterAging({ cacheBust: true })).toMatchObject({ faixas: [] });
    vi.mocked(api.get).mockResolvedValueOnce(ok({ faixas: [] }));
    expect(await obterAging()).toMatchObject({ faixas: [] });

    vi.mocked(api.get).mockResolvedValueOnce(
      ok({ ranking: [{ clienteId: "c1", nomeCliente: "Ana", saldoDevedor: 10 }] }),
    );
    expect(
      (
        await obterRankingDevedores({
          periodo: "mes",
          limit: 10,
          valorMin: "1",
          qtdDividas: "2",
          diasAtraso: "30",
        })
      )[0].clienteNome,
    ).toBe("Ana");

    vi.mocked(isMockEnabled).mockReturnValue(true);
    vi.mocked(api.get).mockResolvedValueOnce(ok([{ clienteId: "c2" }]));
    expect(await obterRankingDevedores({ periodo: "ano", limit: 5 })).toEqual([
      { clienteId: "c2" },
    ]);

    vi.mocked(api.get).mockResolvedValueOnce(ok({ clienteId: "c1", lancamentos: [] }));
    expect(await obterExtratoCliente("c1")).toMatchObject({ clienteId: "c1" });

    vi.mocked(isMockEnabled).mockReturnValue(false);
    vi.mocked(api.get).mockResolvedValueOnce(
      ok({ dataInicio: "2026-01-01", dataFim: "2026-01-31", detalhamento: [] }),
    );
    expect(await obterInadimplenciaPeriodo("2026-01-01", "2026-01-31")).toBeTruthy();
    vi.mocked(isMockEnabled).mockReturnValue(true);
    vi.mocked(api.get).mockResolvedValueOnce(ok({ dataInicio: "x" }));
    expect(await obterInadimplenciaPeriodo("a", "b")).toMatchObject({ dataInicio: "x" });

    vi.mocked(isMockEnabled).mockReturnValue(false);
    vi.mocked(api.get).mockResolvedValueOnce(ok({ detalhamento: [] }));
    expect(await obterPagamentosRecebidos("a", "b")).toBeTruthy();
    vi.mocked(isMockEnabled).mockReturnValue(true);
    vi.mocked(api.get).mockResolvedValueOnce(ok({ totalPagamentos: 1 }));
    expect(await obterPagamentosRecebidos("a", "b")).toMatchObject({ totalPagamentos: 1 });

    vi.mocked(api.get).mockResolvedValueOnce(ok({ mes: "2026-01" }));
    expect(await obterEfetividadeCobranca("2026-01")).toMatchObject({ mes: "2026-01" });
  });
});
