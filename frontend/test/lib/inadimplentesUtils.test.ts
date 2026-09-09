import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Inadimplencia, PagamentoInadimplencia } from "@/types/api";
import {
  ordenarPagamentosPorData,
  diasEmAtraso,
  formatCpfCnpj,
  isInadimplenciaEmAberto,
  statusPagamentoHonorario,
  isInadimplenciaCancelada,
  saldoDevedorItem,
  valoresHonorario,
} from "@/lib/inadimplentesUtils";

function item(partial: Partial<Inadimplencia>): Inadimplencia {
  return {
    clienteId: partial.clienteId ?? "c1",
    valor: partial.valor ?? 0,
    vencimento: partial.vencimento ?? "2026-01-01",
    ...partial,
  };
}

describe("inadimplentesUtils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ordena pagamentos por data e criadoEm", () => {
    const pags: PagamentoInadimplencia[] = [
      { valorPago: 10, dataPagamento: "2026-02-01", criadoEm: "2026-02-01T12:00:00" },
      { valorPago: 20, dataPagamento: "2026-01-01T08:00:00", criadoEm: "2026-01-01T09:00:00" },
      { valorPago: 30, dataPagamento: "2026-01-01", criadoEm: "2026-01-01T08:00:00" },
    ];
    const ordenados = ordenarPagamentosPorData(pags);
    expect(ordenados.map((p) => p.valorPago)).toEqual([30, 20, 10]);
    expect(pags[0].valorPago).toBe(10);
  });

  it("calcula dias em atraso sem valores negativos", () => {
    expect(diasEmAtraso("2020-01-01")).toBeGreaterThan(0);
    expect(diasEmAtraso("2026-09-15T12:00:00")).toBeGreaterThanOrEqual(0);
    expect(diasEmAtraso("2099-12-31")).toBe(0);
  });

  it("formata CPF e CNPJ", () => {
    expect(formatCpfCnpj(undefined)).toBe("");
    expect(formatCpfCnpj("12345678900")).toBe("123.456.789-00");
    expect(formatCpfCnpj("12345678000190")).toBe("12.345.678/0001-90");
    expect(formatCpfCnpj("123")).toBe("123");
  });

  it("classifica status de honorário e cancelamento", () => {
    expect(isInadimplenciaEmAberto(item({ status: "EmAberto" }))).toBe(true);
    expect(isInadimplenciaEmAberto(item({ status: "Pago" }))).toBe(false);
    expect(isInadimplenciaEmAberto(item({}))).toBe(true);
    expect(statusPagamentoHonorario(item({ status: "Pago" }))).toBe("Pago");
    expect(statusPagamentoHonorario(item({ status: "PARCIAL" }))).toBe("Parcial");
    expect(statusPagamentoHonorario(item({ status: "Acordo" }))).toBe("Parcial");
    expect(statusPagamentoHonorario(item({ status: "EmAberto" }))).toBe("Em aberto");
    expect(isInadimplenciaCancelada(item({ status: "CANCELADO" as Inadimplencia["status"] }))).toBe(
      true,
    );
    expect(isInadimplenciaCancelada(item({ status: "EmAberto" }))).toBe(false);
  });

  it("calcula saldo e valores com juros", () => {
    expect(saldoDevedorItem(item({ valor: 1500, juros: 200 }))).toBe(1500);
    expect(valoresHonorario(item({ valor: 1500, juros: 200 }))).toEqual({
      valorOriginal: 1300,
      juros: 200,
      valorTotal: 1500,
    });
    expect(valoresHonorario(item({ valor: 0, valorOriginal: 1000, juros: 250 }))).toEqual({
      valorOriginal: 1000,
      juros: 250,
      valorTotal: 1250,
    });
    expect(saldoDevedorItem(item({ valor: 0, valorOriginal: 1000, juros: 250 }))).toBe(1250);
    const viaDevedor = item({ valorDevedor: 800, juros: 50 });
    (viaDevedor as { valor?: number }).valor = undefined;
    expect(valoresHonorario(viaDevedor).valorTotal).toBe(800);
    expect(valoresHonorario(item({ valor: 0, juros: 0 })).valorOriginal).toBe(0);
    expect(valoresHonorario(item({ valor: 100, valorOriginal: 70, juros: 30 })).valorOriginal).toBe(
      70,
    );
  });
});
