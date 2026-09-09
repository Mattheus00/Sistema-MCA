import { describe, it, expect } from "vitest";
import {
  labelStatusDocumentoCliente,
  labelTipoDocumentoCliente,
  classeBadgeStatusDocumento,
  formatarTamanhoArquivo,
  truncarTexto,
  formatarDataDocumento,
} from "@/lib/documentosClientesUtils";

describe("documentosClientesUtils", () => {
  it("rotula status e tipo", () => {
    expect(labelStatusDocumentoCliente("ENVIADO")).toBe("Novo");
    expect(labelStatusDocumentoCliente("RECEBIDO")).toBe("Recebido");
    expect(labelStatusDocumentoCliente("EM_ANALISE")).toBe("Em análise");
    expect(labelStatusDocumentoCliente("ARQUIVADO")).toBe("Arquivado");
    expect(labelStatusDocumentoCliente("OUTRO")).toBe("OUTRO");
    expect(labelTipoDocumentoCliente("COMPROVANTE")).toBe("Comprovante");
    expect(labelTipoDocumentoCliente("NOTA_FISCAL")).toBe("Nota fiscal");
    expect(labelTipoDocumentoCliente("CONTRATO")).toBe("Contrato");
    expect(labelTipoDocumentoCliente("DECLARACAO")).toBe("Declaração");
    expect(labelTipoDocumentoCliente("OUTRO")).toBe("Outro");
    expect(labelTipoDocumentoCliente("X")).toBe("X");
  });

  it("define classe do badge e formata tamanho/texto", () => {
    expect(classeBadgeStatusDocumento("ENVIADO")).toContain("novo");
    expect(classeBadgeStatusDocumento("EM_ANALISE")).toContain("analise");
    expect(classeBadgeStatusDocumento("ARQUIVADO")).toContain("arquivado");
    expect(classeBadgeStatusDocumento("RECEBIDO")).toContain("recebido");
    expect(formatarTamanhoArquivo(undefined)).toBe("—");
    expect(formatarTamanhoArquivo(0)).toBe("—");
    expect(formatarTamanhoArquivo(500)).toBe("500 B");
    expect(formatarTamanhoArquivo(2048)).toContain("KB");
    expect(formatarTamanhoArquivo(2 * 1024 * 1024)).toContain("MB");
    expect(truncarTexto(undefined)).toBe("—");
    expect(truncarTexto("abc")).toBe("abc");
    expect(truncarTexto("abcdefghij", 6)).toBe("abcde…");
    expect(formatarDataDocumento("2026-09-15")).toMatch(/15/);
  });
});
