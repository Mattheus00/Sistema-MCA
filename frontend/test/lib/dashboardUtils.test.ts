import { describe, it, expect } from "vitest";
import { calcularEvolucaoValorAberto } from "@/lib/dashboardUtils";
import type { Inadimplencia } from "@/types/api";

function divida(partial: Partial<Inadimplencia> & { vencimento: string; valor: number }): Inadimplencia {
  return {
    id: partial.id ?? "1",
    clienteId: partial.clienteId ?? "c1",
    clienteNome: partial.clienteNome ?? "Cliente",
    status: partial.status ?? "EmAberto",
    ...partial,
  };
}

describe("calcularEvolucaoValorAberto", () => {
  it("no período Total acumula dívidas por mês de entrada (não por vencimento)", () => {
    const itens: Inadimplencia[] = [
      divida({
        id: "1",
        createdAt: "2025-07-10",
        vencimento: "2025-07-10",
        valor: 290_000,
      }),
      divida({
        id: "2",
        createdAt: "2026-07-15",
        vencimento: "2026-09-01",
        valor: 2_000,
      }),
      divida({
        id: "3",
        createdAt: "2026-09-05",
        vencimento: "2026-09-20",
        valor: 1_267,
      }),
      divida({ id: "4", vencimento: "2026-07-20", valor: 300, status: "Pago" }),
    ];

    const pontos = calcularEvolucaoValorAberto(itens, "total");
    expect(pontos.map((p) => p.mes)).toEqual(["2025-07", "2026-07", "2026-09"]);
    expect(pontos[0].valor).toBe(290_000);
    expect(pontos[1].valor).toBe(292_000);
    expect(pontos[2].valor).toBe(293_267);
  });

  it("usa saldo devedor com juros quando valor total da API é zero", () => {
    const pontos = calcularEvolucaoValorAberto(
      [divida({ id: "5", vencimento: "2026-01-10", valor: 0, valorOriginal: 1000, juros: 500 })],
      "total"
    );
    expect(pontos[pontos.length - 1].valor).toBe(1500);
  });

  it("usa vencimento como fallback quando não há createdAt", () => {
    const pontos = calcularEvolucaoValorAberto(
      [divida({ id: "6", vencimento: "15/07/2026", valor: 4200 })],
      "total"
    );
    expect(pontos).toHaveLength(1);
    expect(pontos[0].mes).toBe("2026-07");
    expect(pontos[0].valor).toBe(4200);
  });

  it("ignora status INADIMPLENTE da API como em aberto", () => {
    const pontos = calcularEvolucaoValorAberto(
      [divida({ id: "7", vencimento: "2026-03-01", valor: 900, status: "INADIMPLENTE" as Inadimplencia["status"] })],
      "total"
    );
    expect(pontos[pontos.length - 1].valor).toBe(900);
  });

  it("nos últimos 6 meses mostra acumulado até cada mês da janela", () => {
    const itens: Inadimplencia[] = [
      divida({ id: "1", createdAt: "2024-03-10", vencimento: "2024-03-10", valor: 1000 }),
      divida({ id: "2", createdAt: "2025-11-15", vencimento: "2025-11-15", valor: 2000 }),
      divida({ id: "3", createdAt: "2026-07-01", vencimento: "2026-07-01", valor: 5000 }),
    ];
    const pontos = calcularEvolucaoValorAberto(itens, 6);
    expect(pontos).toHaveLength(6);
    expect(pontos[pontos.length - 1].valor).toBe(8000);
    expect(pontos.every((p) => typeof p.mesLabel === "string")).toBe(true);
  });
});
