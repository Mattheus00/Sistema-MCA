import { describe, expect, it } from "vitest";
import {
  STATUS_CLIENTE,
  STATUS_DIVIDA,
  STATUS_DIVIDA_FRONT,
  statusEh,
  statusNormalizado,
} from "@/lib/constants/status";

describe("constants/status", () => {
  it("espelha os enums Java de cliente e dívida", () => {
    expect(STATUS_CLIENTE.ATIVO).toBe("ATIVO");
    expect(STATUS_CLIENTE.INATIVO).toBe("INATIVO");
    expect(STATUS_DIVIDA.EM_ABERTO).toBe("EM_ABERTO");
    expect(STATUS_DIVIDA.QUITADA).toBe("QUITADA");
    expect(STATUS_DIVIDA_FRONT.PAGO).toBe("Pago");
  });

  it("normaliza espaços e caixa", () => {
    expect(statusNormalizado(" em aberto ")).toBe("EM_ABERTO");
    expect(statusNormalizado("Pago")).toBe("PAGO");
  });

  it("compara status ignorando caixa e aliases", () => {
    expect(statusEh("Pago", STATUS_DIVIDA_FRONT.PAGO, STATUS_DIVIDA.QUITADA)).toBe(true);
    expect(statusEh("QUITADA", "PAGO", "QUITADA")).toBe(true);
    expect(statusEh("EmAberto", STATUS_DIVIDA.CANCELADA)).toBe(false);
  });
});
