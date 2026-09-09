import { describe, it, expect } from "vitest";
import {
  parseValorReais,
  formatarCentavosParaInput,
  formatarMoeda,
  formatarData,
  formatarDataHora,
  formatarMesAno,
  formatarValorMovimentacao,
} from "@/lib/valorBrasil";

describe("parseValorReais", () => {
  it("retorna 0 para string vazia ou só espaços", () => {
    expect(parseValorReais("")).toBe(0);
    expect(parseValorReais("   ")).toBe(0);
  });

  it("interpreta formato BR: ponto = milhar, vírgula = decimal", () => {
    expect(parseValorReais("1.000,00")).toBe(1000);
    expect(parseValorReais("1.000")).toBe(1000);
    expect(parseValorReais("2.500,50")).toBe(2500.5);
    expect(parseValorReais("150,50")).toBe(150.5);
  });

  it("interpreta valor sem vírgula com um ponto como decimal (ex.: 150.50)", () => {
    expect(parseValorReais("150.50")).toBe(150.5);
    expect(parseValorReais("200")).toBe(200);
  });

  it("interpreta múltiplos pontos sem vírgula como milhar (ex.: 1.000.000)", () => {
    expect(parseValorReais("1.000.000")).toBe(1000000);
  });

  it("remove caracteres não numéricos exceto ponto e vírgula", () => {
    expect(parseValorReais("R$ 1.000,00")).toBe(1000);
    expect(parseValorReais("  200,50  ")).toBe(200.5);
  });

  it("evita bug de interpretar 1.000,00 como 1 (um real)", () => {
    expect(parseValorReais("1.000,00")).toBe(1000);
    expect(parseValorReais("1.000")).toBe(1000);
  });
});

describe("formatarCentavosParaInput", () => {
  it("retorna string vazia para null, undefined ou 0", () => {
    expect(formatarCentavosParaInput(null)).toBe("");
    expect(formatarCentavosParaInput(undefined)).toBe("");
    expect(formatarCentavosParaInput(0)).toBe("");
  });

  it("formata centavos em reais no padrão pt-BR com duas casas", () => {
    expect(formatarCentavosParaInput(20000)).toBe("200,00");
    expect(formatarCentavosParaInput(100000)).toBe("1.000,00");
    expect(formatarCentavosParaInput(15050)).toBe("150,50");
  });
});

describe("formatarMoeda", () => {
  it("formata número finito em BRL", () => {
    expect(formatarMoeda(1500)).toContain("1.500");
    expect(formatarMoeda(1500)).toMatch(/R\$/);
  });

  it("retorna travessão para nulo/NaN", () => {
    expect(formatarMoeda(null)).toBe("—");
    expect(formatarMoeda(undefined)).toBe("—");
    expect(formatarMoeda(Number.NaN)).toBe("—");
  });

  it("trata nulo como zero quando nuloComoZero", () => {
    expect(formatarMoeda(null, { nuloComoZero: true })).toContain("0,00");
  });
});

describe("formatarData", () => {
  it("formata ISO date-only sem fuso (modo iso)", () => {
    expect(formatarData("2026-01-10")).toBe("10/01/2026");
    expect(formatarData("2026-01-10T15:30:00")).toBe("10/01/2026");
  });

  it("retorna travessão para vazio", () => {
    expect(formatarData("")).toBe("—");
    expect(formatarData(undefined)).toBe("—");
  });

  it("devolve o texto original quando o recorte ISO é incompleto", () => {
    expect(formatarData("10/01/2026")).toBe("10/01/2026");
  });
});

describe("formatarDataHora", () => {
  it("retorna travessão para vazio", () => {
    expect(formatarDataHora(undefined)).toBe("—");
    expect(formatarDataHora("")).toBe("—");
  });

  it("formata instante válido com hora", () => {
    const texto = formatarDataHora("2026-03-15T14:05:00");
    expect(texto).toMatch(/15\/03\/2026/);
    expect(texto).toMatch(/14:05/);
  });

  it("usa fallback de data ISO quando o instante é inválido", () => {
    expect(formatarDataHora("2026-03-15Txx", { fallbackData: true })).toBe("15/03/2026");
    expect(formatarDataHora("nao-e-data")).toBe("nao-e-data");
  });
});

describe("formatarMesAno", () => {
  it("formata YYYY-MM e ISO datetime", () => {
    expect(formatarMesAno("2026-03")).toBe("03/2026");
    expect(formatarMesAno("2026-03-15T00:00:00")).toBe("03/2026");
  });
});

describe("formatarValorMovimentacao", () => {
  it("prefixa + para entrada e − para saída", () => {
    expect(formatarValorMovimentacao("ENTRADA", 100)).toMatch(/^\+ /);
    expect(formatarValorMovimentacao("SAIDA", 100)).toMatch(/^− /);
  });
});
