/** Tipos do simulador tributário (CBS/IBS). A lógica fica em `lib/taxSimulator.ts`. */

export type TaxSimulatorTabId =
  "rapido" | "formacao" | "credito" | "nfe" | "cashback" | "ia" | "regime";

export type SimulationType = "PRECO_FINAL" | "FORMAR_PRECO" | "SEPARAR";

export type SimulationYear = "2026" | "2027" | "2028" | "2029" | "2030" | "2031" | "2032" | "2033+";

export type TaxProfile = "PADRAO" | "SIMPLES" | "MEI" | "PERSONALIZADA";

export type OperationType = "PRODUTO" | "SERVICO" | "MISTA";

export type QuickSimulationInput = {
  simulationType: SimulationType;
  operationValue: number;
  cbsPercent: number;
  ibsPercent: number;
};

export type QuickSimulationResult = {
  operationValue: number;
  cbsValue: number;
  ibsValue: number;
  totalTax: number;
  netValue: number;
  finalPrice: number;
  taxBurdenPercent: number;
  cbsPercent: number;
  ibsPercent: number;
};

export type PricingSimulationInput = {
  cost: number;
  extraExpenses: number;
  marginPercent: number;
  totalTaxPercent: number;
};

export type PricingSimulationResult = {
  suggestedMinPrice: number;
  estimatedProfit: number;
  estimatedTaxes: number;
  netMarginPercent: number;
  costBase: number;
};

export type TaxCreditSimulationInput = {
  salesTotal: number;
  cbsSalesPercent: number;
  ibsSalesPercent: number;
  purchasesTotal: number;
  cbsCreditPercent: number;
  ibsCreditPercent: number;
};

export type TaxCreditSimulationResult = {
  cbsDebit: number;
  ibsDebit: number;
  cbsCredit: number;
  ibsCredit: number;
  cbsToPay: number;
  ibsToPay: number;
  totalToPay: number;
};

export type NfeSimulationInput = {
  productsValue: number;
  discount: number;
  freight: number;
  cbsPercent: number;
  ibsPercent: number;
};

export type NfeSimulationResult = {
  baseCalculation: number;
  cbs: number;
  ibs: number;
  totalTax: number;
  invoiceTotal: number;
};
