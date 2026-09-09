import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },
    isMockEnabled: vi.fn(() => false),
    getAuthToken: vi.fn(() => null),
  };
});

import { api, getAuthToken, isMockEnabled } from "@/lib/api";
import {
  criarLoteEnvioBoletos,
  listarHistoricoLotes,
  consultarLoteEnvioBoletos,
  consultarResultadoEnvioLote,
  atualizarClienteItem,
  confirmarItemEnvioBoleto,
  ignorarItemEnvioBoleto,
  validarLoteEnvioBoletos,
  enviarLoteEnvioBoletos,
  baixarPdfItem,
  abrirPdfItem,
  baixarRelatorioCsv,
} from "@/lib/envioBoletosApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

const lote = { loteId: "l1", status: "CONFERENCIA", itens: [] };

describe("envioBoletosApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isMockEnabled).mockReturnValue(false);
    vi.mocked(getAuthToken).mockReturnValue(null);
  });

  it("cria lote a partir de arquivos e do envelope da API", async () => {
    const file = new File(["pdf"], "a.pdf", { type: "application/pdf" });
    vi.mocked(api.post).mockResolvedValueOnce(ok({ lote }));
    expect((await criarLoteEnvioBoletos([file])).loteId).toBe("l1");
    vi.mocked(api.post).mockResolvedValueOnce(ok(lote));
    expect((await criarLoteEnvioBoletos([file])).loteId).toBe("l1");
  });

  it("consulta histórico, lote, resultado e ações de item", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      ok({ content: [{ loteId: "l1", status: "CONCLUIDO" }], totalElements: 1 }),
    );
    expect(
      (
        await listarHistoricoLotes({
          page: 0,
          status: "CONCLUIDO",
          dataInicio: "2026-01-01",
          dataFim: "2026-01-31",
        })
      ).content[0].loteId,
    ).toBe("l1");

    vi.mocked(api.get).mockResolvedValue(ok(lote));
    expect((await consultarLoteEnvioBoletos("l1")).loteId).toBe("l1");
    vi.mocked(api.get).mockResolvedValueOnce(ok({ loteId: "l1", enviados: 1, erros: 0 }));
    expect(await consultarResultadoEnvioLote("l1")).toBeTruthy();

    vi.mocked(api.patch).mockResolvedValue(ok({}));
    await atualizarClienteItem("l1", "i1", "c1");
    await confirmarItemEnvioBoleto("l1", "i1");
    await ignorarItemEnvioBoleto("l1", "i1");
  });

  it("valida e envia lote", async () => {
    vi.mocked(api.post).mockResolvedValueOnce(ok({ loteId: "l1", itens: [] }));
    expect((await validarLoteEnvioBoletos("l1")).loteId).toBe("l1");

    vi.mocked(api.post).mockResolvedValueOnce(ok({ podeEnviar: true, bloqueios: [] }));
    vi.mocked(api.get).mockResolvedValueOnce(ok(lote));
    const validado = await validarLoteEnvioBoletos("l1");
    expect(validado.validacao?.podeEnviar).toBe(true);

    vi.mocked(api.post).mockResolvedValueOnce(ok({}));
    vi.mocked(api.get).mockResolvedValueOnce(ok(lote));
    await enviarLoteEnvioBoletos("l1", { permitirReenvioDuplicado: true, itemIds: ["i1"] });
  });

  it("baixa PDF/CSV e abre PDF", async () => {
    globalThis.URL.createObjectURL = vi.fn(() => "blob:x");
    globalThis.URL.revokeObjectURL = vi.fn();
    const open = vi.fn(() => ({ closed: false }));
    vi.stubGlobal("open", open);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(["pdf"])),
      }),
    );
    const blob = await baixarPdfItem("l1", "i1");
    expect(blob).toBeInstanceOf(Blob);
    await abrirPdfItem("l1", "i1");
    expect(open).toHaveBeenCalled();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );
    await expect(baixarPdfItem("l1", "i1")).rejects.toThrow("Não foi possível abrir o PDF.");
    await expect(baixarRelatorioCsv("l1")).rejects.toThrow("Não foi possível baixar o relatório.");

    vi.mocked(isMockEnabled).mockReturnValue(true);
    vi.mocked(api.get).mockResolvedValue(ok(new Blob(["x"])));
    await expect(baixarPdfItem("l1", "i1")).resolves.toBeInstanceOf(Blob);
    const click = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
    await baixarRelatorioCsv("l1");
    expect(click).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
