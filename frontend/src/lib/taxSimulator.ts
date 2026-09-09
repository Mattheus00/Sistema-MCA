import { formatarMoeda, parseValorReais } from "@/lib/valorBrasil";
import type {
  NfeSimulationInput,
  NfeSimulationResult,
  OperationType,
  PricingSimulationInput,
  PricingSimulationResult,
  QuickSimulationInput,
  QuickSimulationResult,
  SimulationType,
  SimulationYear,
  TaxCreditSimulationInput,
  TaxCreditSimulationResult,
  TaxProfile,
  TaxSimulatorTabId,
} from "@/types/taxSimulator";

export const SIMULATION_TYPE_OPTIONS: {
  id: SimulationType;
  title: string;
  description: string;
  apiTipo: "POR_DENTRO" | "POR_FORA" | "SEPARAR_CBS_IBS";
}[] = [
  {
    id: "PRECO_FINAL",
    title: "Tenho um preço final",
    description: "O imposto já está dentro do valor informado.",
    apiTipo: "POR_DENTRO",
  },
  {
    id: "FORMAR_PRECO",
    title: "Quero formar o preço final",
    description: "Tenho um valor líquido e quero adicionar imposto.",
    apiTipo: "POR_FORA",
  },
  {
    id: "SEPARAR",
    title: "Quero separar CBS e IBS",
    description: "Veja a composição detalhada dos tributos.",
    apiTipo: "SEPARAR_CBS_IBS",
  },
];

export const YEAR_OPTIONS: { value: SimulationYear; label: string }[] = [
  { value: "2026", label: "2026 — fase de teste" },
  { value: "2027", label: "2027" },
  { value: "2028", label: "2028" },
  { value: "2029", label: "2029" },
  { value: "2030", label: "2030" },
  { value: "2031", label: "2031" },
  { value: "2032", label: "2032" },
  { value: "2033+", label: "2033 em diante" },
];

export const PROFILE_OPTIONS: { value: TaxProfile; label: string }[] = [
  { value: "PADRAO", label: "Regime padrão" },
  { value: "SIMPLES", label: "Simples Nacional" },
  { value: "MEI", label: "MEI" },
  { value: "PERSONALIZADA", label: "Alíquota personalizada" },
];

export const OPERATION_OPTIONS: { value: OperationType; label: string }[] = [
  { value: "PRODUTO", label: "Venda de produto" },
  { value: "SERVICO", label: "Prestação de serviço" },
  { value: "MISTA", label: "Operação mista" },
];

export const TAX_SIMULATOR_TABS: { id: TaxSimulatorTabId; label: string }[] = [
  { id: "rapido", label: "Simulador rápido" },
  { id: "formacao", label: "Formação de preço" },
  { id: "credito", label: "Crédito tributário" },
  { id: "nfe", label: "NF-e" },
  { id: "cashback", label: "Cashback" },
  { id: "ia", label: "Dúvidas IA" },
  { id: "regime", label: "Regime por CNPJ" },
];

export function percentToRate(percent: number): number {
  return percent / 100;
}

export function parsePercentInput(value: string): number {
  const n = parseValorReais(value.replace(/%/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export { formatarMoeda };

export function formatarPercentual(valor: number, casas = 2): string {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

export function getDefaultRates(
  year: SimulationYear,
  profile: TaxProfile,
): { cbs: number; ibs: number } {
  if (profile === "MEI") return { cbs: 0, ibs: 0 };
  if (profile === "SIMPLES") {
    if (year === "2026") return { cbs: 0.45, ibs: 0.05 };
    return { cbs: 4.4, ibs: 8.9 };
  }
  if (year === "2026") return { cbs: 0.9, ibs: 0.1 };
  if (year === "2027") return { cbs: 2.5, ibs: 5 };
  if (year === "2028") return { cbs: 4, ibs: 8 };
  if (year === "2029") return { cbs: 5.5, ibs: 11 };
  if (year === "2030") return { cbs: 6.5, ibs: 13 };
  if (year === "2031") return { cbs: 7.5, ibs: 15 };
  if (year === "2032") return { cbs: 8, ibs: 16.5 };
  return { cbs: 8.8, ibs: 17.9 };
}

export function getExplanation(type: SimulationType): string {
  if (type === "PRECO_FINAL") {
    return "O imposto foi considerado dentro do preço informado. O valor líquido mostra a estimativa após separar CBS e IBS.";
  }
  if (type === "FORMAR_PRECO") {
    return "O imposto foi adicionado ao valor líquido informado. O preço final sugerido mostra quanto cobrar para preservar o valor desejado.";
  }
  return "A simulação separa a parcela estimada de CBS e IBS para facilitar a análise da composição tributária.";
}

export function simulateQuick(input: QuickSimulationInput): QuickSimulationResult | null {
  const operationValue = input.operationValue;
  if (operationValue <= 0) return null;

  const cbsRate = percentToRate(input.cbsPercent);
  const ibsRate = percentToRate(input.ibsPercent);
  const totalRate = cbsRate + ibsRate;

  if (input.simulationType === "FORMAR_PRECO") {
    if (totalRate >= 1) return null;
    const finalPrice = operationValue / (1 - totalRate);
    const totalTax = finalPrice - operationValue;
    const cbsValue = finalPrice * cbsRate;
    const ibsValue = finalPrice * ibsRate;
    return {
      operationValue,
      cbsValue,
      ibsValue,
      totalTax,
      netValue: operationValue,
      finalPrice,
      taxBurdenPercent: finalPrice > 0 ? (totalTax / finalPrice) * 100 : 0,
      cbsPercent: input.cbsPercent,
      ibsPercent: input.ibsPercent,
    };
  }

  const cbsValue = operationValue * cbsRate;
  const ibsValue = operationValue * ibsRate;
  const totalTax = cbsValue + ibsValue;
  const netValue = operationValue - totalTax;
  const finalPrice = input.simulationType === "PRECO_FINAL" ? operationValue : operationValue;

  return {
    operationValue,
    cbsValue,
    ibsValue,
    totalTax,
    netValue,
    finalPrice,
    taxBurdenPercent: operationValue > 0 ? (totalTax / operationValue) * 100 : 0,
    cbsPercent: input.cbsPercent,
    ibsPercent: input.ibsPercent,
  };
}

export function simulatePricing(input: PricingSimulationInput): PricingSimulationResult | null {
  const costBase = input.cost + input.extraExpenses;
  if (costBase <= 0) return null;
  const totalRate = percentToRate(input.totalTaxPercent);
  const marginRate = percentToRate(input.marginPercent);
  const suggestedMinPrice = costBase * (1 + marginRate);
  const estimatedTaxes = suggestedMinPrice * totalRate;
  const estimatedProfit = suggestedMinPrice - costBase - estimatedTaxes;
  const netMarginPercent = suggestedMinPrice > 0 ? (estimatedProfit / suggestedMinPrice) * 100 : 0;
  return { suggestedMinPrice, estimatedProfit, estimatedTaxes, netMarginPercent, costBase };
}

export function simulateTaxCredit(input: TaxCreditSimulationInput): TaxCreditSimulationResult {
  const cbsDebit = input.salesTotal * percentToRate(input.cbsSalesPercent);
  const ibsDebit = input.salesTotal * percentToRate(input.ibsSalesPercent);
  const cbsCredit = input.purchasesTotal * percentToRate(input.cbsCreditPercent);
  const ibsCredit = input.purchasesTotal * percentToRate(input.ibsCreditPercent);
  const cbsToPay = Math.max(0, cbsDebit - cbsCredit);
  const ibsToPay = Math.max(0, ibsDebit - ibsCredit);
  return {
    cbsDebit,
    ibsDebit,
    cbsCredit,
    ibsCredit,
    cbsToPay,
    ibsToPay,
    totalToPay: cbsToPay + ibsToPay,
  };
}

export function simulateNfe(input: NfeSimulationInput): NfeSimulationResult {
  const baseCalculation = Math.max(0, input.productsValue - input.discount + input.freight);
  const cbs = baseCalculation * percentToRate(input.cbsPercent);
  const ibs = baseCalculation * percentToRate(input.ibsPercent);
  const totalTax = cbs + ibs;
  return {
    baseCalculation,
    cbs,
    ibs,
    totalTax,
    invoiceTotal: baseCalculation + totalTax,
  };
}

/** Mapeia perfil do simulador para categoria da API legada. */
export function profileToApiCategory(profile: TaxProfile): "PLENO" | "REDUZIDO" | "ZERO" {
  if (profile === "MEI") return "ZERO";
  if (profile === "SIMPLES") return "REDUZIDO";
  return "PLENO";
}

export function simulationTypeToApiTipo(
  type: SimulationType,
): "POR_DENTRO" | "POR_FORA" | "SEPARAR_CBS_IBS" {
  return SIMULATION_TYPE_OPTIONS.find((o) => o.id === type)?.apiTipo ?? "POR_DENTRO";
}
