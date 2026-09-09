import { describe, it, expect } from "vitest";
import {
  SIMULATION_TYPE_OPTIONS,
  YEAR_OPTIONS,
  PROFILE_OPTIONS,
  OPERATION_OPTIONS,
  TAX_SIMULATOR_TABS,
  percentToRate,
  parsePercentInput,
  formatarPercentual,
  getDefaultRates,
  getExplanation,
  simulateQuick,
  simulatePricing,
  simulateTaxCredit,
  simulateNfe,
  profileToApiCategory,
  simulationTypeToApiTipo,
} from "@/lib/taxSimulator";
import type { SimulationType } from "@/types/taxSimulator";

describe("taxSimulator", () => {
  it("expõe opções de UI", () => {
    expect(SIMULATION_TYPE_OPTIONS).toHaveLength(3);
    expect(YEAR_OPTIONS[0].value).toBe("2026");
    expect(PROFILE_OPTIONS.some((p) => p.value === "MEI")).toBe(true);
    expect(OPERATION_OPTIONS).toHaveLength(3);
    expect(TAX_SIMULATOR_TABS.some((t) => t.id === "rapido")).toBe(true);
  });

  it("converte percentuais e formata", () => {
    expect(percentToRate(10)).toBe(0.1);
    expect(parsePercentInput("12,5%")).toBe(12.5);
    expect(parsePercentInput("abc")).toBe(0);
    expect(formatarPercentual(10)).toContain("%");
  });

  it("retorna alíquotas padrão por ano e perfil", () => {
    expect(getDefaultRates("2026", "MEI")).toEqual({ cbs: 0, ibs: 0 });
    expect(getDefaultRates("2026", "SIMPLES")).toEqual({ cbs: 0.45, ibs: 0.05 });
    expect(getDefaultRates("2027", "SIMPLES")).toEqual({ cbs: 4.4, ibs: 8.9 });
    expect(getDefaultRates("2026", "PADRAO")).toEqual({ cbs: 0.9, ibs: 0.1 });
    expect(getDefaultRates("2027", "PADRAO").cbs).toBe(2.5);
    expect(getDefaultRates("2028", "PADRAO").cbs).toBe(4);
    expect(getDefaultRates("2029", "PADRAO").cbs).toBe(5.5);
    expect(getDefaultRates("2030", "PADRAO").cbs).toBe(6.5);
    expect(getDefaultRates("2031", "PADRAO").cbs).toBe(7.5);
    expect(getDefaultRates("2032", "PADRAO").cbs).toBe(8);
    expect(getDefaultRates("2033+", "PERSONALIZADA")).toEqual({ cbs: 8.8, ibs: 17.9 });
  });

  it("explica cada tipo de simulação", () => {
    expect(getExplanation("PRECO_FINAL")).toContain("dentro do preço");
    expect(getExplanation("FORMAR_PRECO")).toContain("adicionado");
    expect(getExplanation("SEPARAR")).toContain("CBS e IBS");
  });

  it("simula rápido: preço final, formar preço e inválidos", () => {
    expect(
      simulateQuick({
        operationValue: 0,
        cbsPercent: 10,
        ibsPercent: 10,
        simulationType: "PRECO_FINAL",
      }),
    ).toBeNull();
    expect(
      simulateQuick({
        operationValue: 100,
        cbsPercent: 60,
        ibsPercent: 50,
        simulationType: "FORMAR_PRECO",
      }),
    ).toBeNull();

    const formar = simulateQuick({
      operationValue: 100,
      cbsPercent: 10,
      ibsPercent: 10,
      simulationType: "FORMAR_PRECO",
    });
    expect(formar).not.toBeNull();
    expect(formar?.netValue).toBe(100);
    expect(formar?.finalPrice).toBeCloseTo(125);
    expect(formar?.taxBurdenPercent).toBeGreaterThan(0);

    const final = simulateQuick({
      operationValue: 100,
      cbsPercent: 10,
      ibsPercent: 5,
      simulationType: "PRECO_FINAL",
    });
    expect(final?.cbsValue).toBe(10);
    expect(final?.ibsValue).toBe(5);
    expect(final?.netValue).toBe(85);
    expect(final?.finalPrice).toBe(100);

    const separar = simulateQuick({
      operationValue: 200,
      cbsPercent: 8,
      ibsPercent: 2,
      simulationType: "SEPARAR",
    });
    expect(separar?.totalTax).toBe(20);
  });

  it("simula formação de preço e crédito", () => {
    expect(
      simulatePricing({ cost: 0, extraExpenses: 0, marginPercent: 10, totalTaxPercent: 10 }),
    ).toBeNull();
    const pricing = simulatePricing({
      cost: 80,
      extraExpenses: 20,
      marginPercent: 10,
      totalTaxPercent: 10,
    });
    expect(pricing?.costBase).toBe(100);
    expect(pricing?.suggestedMinPrice).toBeCloseTo(110);
    expect(pricing?.estimatedTaxes).toBeCloseTo(11);
    expect(pricing?.netMarginPercent).toBeCloseTo(((110 - 100 - 11) / 110) * 100);

    const credito = simulateTaxCredit({
      salesTotal: 1000,
      purchasesTotal: 400,
      cbsSalesPercent: 10,
      ibsSalesPercent: 5,
      cbsCreditPercent: 20,
      ibsCreditPercent: 20,
    });
    expect(credito.cbsDebit).toBe(100);
    expect(credito.cbsCredit).toBe(80);
    expect(credito.cbsToPay).toBe(20);
    expect(credito.ibsToPay).toBe(0);
    expect(credito.totalToPay).toBe(20);
  });

  it("simula NF-e e mapeia perfil/tipo para a API", () => {
    const nfe = simulateNfe({
      productsValue: 100,
      discount: 10,
      freight: 5,
      cbsPercent: 10,
      ibsPercent: 10,
    });
    expect(nfe.baseCalculation).toBe(95);
    expect(nfe.totalTax).toBeCloseTo(19);
    expect(nfe.invoiceTotal).toBeCloseTo(114);

    expect(profileToApiCategory("MEI")).toBe("ZERO");
    expect(profileToApiCategory("SIMPLES")).toBe("REDUZIDO");
    expect(profileToApiCategory("PADRAO")).toBe("PLENO");
    expect(simulationTypeToApiTipo("PRECO_FINAL")).toBe("POR_DENTRO");
    expect(simulationTypeToApiTipo("FORMAR_PRECO")).toBe("POR_FORA");
    expect(simulationTypeToApiTipo("SEPARAR")).toBe("SEPARAR_CBS_IBS");
    expect(simulationTypeToApiTipo("X" as SimulationType)).toBe("POR_DENTRO");
  });
});
