import {
  formatarData as formatarDataBr,
  formatarMoeda as formatarMoedaBr,
} from "@/lib/valorBrasil";

export function formatarData(s: string) {
  return formatarDataBr(s, { modo: "instant" });
}

export function formatarMoeda(n: number | null | undefined) {
  return formatarMoedaBr(n, { nuloComoZero: true });
}

export function formatarPercentual(n: number | null | undefined, casas = 1) {
  const valor = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${valor.toFixed(casas)}%`;
}
