import { describe, it, expect } from "vitest";
import { maskCpfCnpj, onlyDigitsCpfCnpj } from "@/lib/portalUtils";
import { formatarMoeda } from "@/lib/valorBrasil";

describe("portalUtils", () => {
  it("mascara CPF", () => {
    expect(maskCpfCnpj("12345678900")).toBe("123.456.789-00");
  });

  it("mascara CNPJ", () => {
    expect(onlyDigitsCpfCnpj("12.345.678/0001-90")).toBe("12345678000190");
  });

  it("formata moeda em pt-BR", () => {
    expect(formatarMoeda(1500)).toContain("1.500");
  });
});
