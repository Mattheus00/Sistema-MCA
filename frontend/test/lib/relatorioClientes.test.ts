import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportarRelatorioClientesExcel } from "@/lib/relatorioClientes";
import type { Cliente } from "@/types/api";

describe("relatorioClientes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => "blob:x");
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it("exporta CSV com filtros e formatação", () => {
    const click = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
    const clientes: Cliente[] = [
      {
        nome: "Ana",
        codigo: "4",
        cpf: "12345678900",
        celular: "31988887777",
        email: "a@test.com",
        endereco: "Rua A",
        situacao: "Ativo",
      },
      {
        nome: "Empresa",
        cpf: "12345678000190",
        celular: "31",
        situacao: "Inativo",
      },
      { nome: "Sem docs", celular: "3199999" },
    ];
    exportarRelatorioClientesExcel(clientes, { situacao: "ativo" });
    expect(click).toHaveBeenCalled();
    exportarRelatorioClientesExcel(clientes);
    expect(click).toHaveBeenCalledTimes(2);
  });
});
