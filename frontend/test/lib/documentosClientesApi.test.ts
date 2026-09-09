import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      patch: vi.fn(),
    },
    isMockEnabled: vi.fn(() => false),
    getAuthToken: vi.fn(() => "tok"),
  };
});

import { api, getAuthToken, isMockEnabled } from "@/lib/api";
import {
  listarDocumentosClientes,
  listarDocumentosPorCliente,
  obterDocumentoCliente,
  obterResumoDocumentosClientes,
  obterContagemDocumentosNovos,
  invalidateDocumentosClientesResumo,
  DOCUMENTOS_CLIENTES_RESUMO_INVALIDATE_EVENT,
  atualizarStatusDocumento,
  responderDocumento,
  baixarArquivoDocumento,
  abrirArquivoDocumento,
} from "@/lib/documentosClientesApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

const doc = {
  documentoId: "d1",
  clienteId: "c1",
  clienteNome: "Ana",
  tipo: "COMPROVANTE",
  status: "ENVIADO",
  nomeOriginal: "a.pdf",
};

describe("documentosClientesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isMockEnabled).mockReturnValue(false);
    vi.mocked(getAuthToken).mockReturnValue("tok");
  });

  it("lista, obtém e atualiza documentos", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(ok({ content: [doc], totalElements: 1 }));
    expect(
      (await listarDocumentosClientes({ clienteId: "c1", status: "ENVIADO", tipo: "COMPROVANTE" }))
        .content[0].documentoId,
    ).toBe("d1");
    vi.mocked(api.get).mockResolvedValueOnce(ok({ content: [doc] }));
    expect((await listarDocumentosPorCliente("c1")).content[0].documentoId).toBe("d1");
    vi.mocked(api.get).mockResolvedValueOnce(ok(doc));
    expect((await obterDocumentoCliente("d1")).documentoId).toBe("d1");
    vi.mocked(api.get).mockResolvedValueOnce(
      ok({ pendentes: 2, recebidos: 1, emAnalise: 0, arquivados: 0 }),
    );
    expect((await obterResumoDocumentosClientes()).pendentes).toBe(2);
    vi.mocked(api.get).mockResolvedValueOnce(ok({ pendentes: 4 }));
    expect(await obterContagemDocumentosNovos()).toBe(4);
    vi.mocked(api.get)
      .mockResolvedValueOnce(ok({ recebidos: 1 }))
      .mockResolvedValueOnce(ok({ content: [], totalElements: 7 }));
    expect(await obterContagemDocumentosNovos()).toBe(7);

    vi.mocked(api.patch).mockResolvedValueOnce(ok(doc));
    expect((await atualizarStatusDocumento("d1", "RECEBIDO")).documentoId).toBe("d1");
    vi.mocked(api.patch).mockResolvedValueOnce(ok({}));
    vi.mocked(api.get).mockResolvedValueOnce(ok(doc));
    expect((await atualizarStatusDocumento("d1", "RECEBIDO")).documentoId).toBe("d1");
    vi.mocked(api.patch).mockResolvedValueOnce(ok(doc));
    expect((await responderDocumento("d1", "  ok  ")).documentoId).toBe("d1");
    vi.mocked(api.patch).mockResolvedValueOnce(ok({}));
    vi.mocked(api.get).mockResolvedValueOnce(ok(doc));
    expect((await responderDocumento("d1", "ok")).documentoId).toBe("d1");
  });

  it("dispara invalidação e baixa/abre arquivo", async () => {
    const handler = vi.fn();
    window.addEventListener(DOCUMENTOS_CLIENTES_RESUMO_INVALIDATE_EVENT, handler);
    invalidateDocumentosClientesResumo();
    expect(handler).toHaveBeenCalled();
    window.removeEventListener(DOCUMENTOS_CLIENTES_RESUMO_INVALIDATE_EVENT, handler);

    globalThis.URL.createObjectURL = vi.fn(() => "blob:x");
    globalThis.URL.revokeObjectURL = vi.fn();
    const click = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
    const open = vi.fn(() => ({ closed: false }));
    vi.stubGlobal("open", open);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(["x"])),
      }),
    );
    await baixarArquivoDocumento("d1", "a.pdf");
    expect(click).toHaveBeenCalled();
    await abrirArquivoDocumento("d1");
    expect(open).toHaveBeenCalled();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(baixarArquivoDocumento("d1")).rejects.toThrow(
      "Não foi possível baixar o arquivo.",
    );
    await expect(abrirArquivoDocumento("d1")).rejects.toThrow("Não foi possível abrir o arquivo.");

    vi.mocked(isMockEnabled).mockReturnValue(true);
    vi.mocked(api.get).mockResolvedValue(ok(new Blob(["x"])));
    await baixarArquivoDocumento("d1");
    await abrirArquivoDocumento("d1");
    vi.unstubAllGlobals();
  });
});
