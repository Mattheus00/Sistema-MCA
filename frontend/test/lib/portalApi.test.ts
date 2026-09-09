import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    isMockEnabled: vi.fn(() => true),
    api: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

import { api } from "@/lib/api";
import {
  loginPortal,
  ativarPortal,
  logoutPortal,
  fetchPortalResumo,
  fetchPortalDividas,
  fetchPortalDivida,
  fetchPortalExtrato,
  listarDocumentos,
  uploadDocumento,
  downloadDocumentoUrl,
  baixarDocumento,
} from "@/lib/portalApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

describe("portalApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("autentica, resume e lista dívidas", async () => {
    vi.mocked(api.post).mockResolvedValueOnce(
      ok({ token: "t", clienteNome: "Ana", clienteId: "c1" }),
    );
    expect(await loginPortal("123.456.789-00", "senha")).toMatchObject({ token: "t" });
    vi.mocked(api.post).mockResolvedValueOnce(ok({ token: "t2" }));
    await ativarPortal("12345678900", "a@test.com", "s", "s");
    logoutPortal();

    vi.mocked(api.get).mockResolvedValueOnce(
      ok({ saldoDevedor: 10, dividasAbertas: 2, dividasVencidas: 1, clienteNome: "Ana" }),
    );
    const resumo = await fetchPortalResumo();
    expect(resumo.saldoDevedorTotal).toBe(10);
    expect(resumo.quantidadeDividasAbertas).toBe(2);

    vi.mocked(api.get).mockResolvedValueOnce(
      ok([{ id: "d1", valor: 50, dataVencimento: "2026-01-01" }]),
    );
    expect((await fetchPortalDividas())[0].valorDevedor).toBe(50);
    vi.mocked(api.get).mockResolvedValueOnce(
      ok({ content: [{ dividaId: "d2", valorDevedor: 1 }] }),
    );
    expect((await fetchPortalDividas("todas"))[0].id).toBe("d2");
    vi.mocked(api.get).mockResolvedValueOnce(ok({ foo: 1 }));
    expect(await fetchPortalDividas()).toEqual([]);

    vi.mocked(api.get).mockResolvedValueOnce(
      ok({
        id: "d1",
        valor: 10,
        pagamentos: [{ id: 1, dataPagamento: "2026-01-02", valor: 5, metodo: "PIX" }],
      }),
    );
    expect((await fetchPortalDivida("d1")).pagamentos).toHaveLength(1);
  });

  it("consulta extrato, documentos e download", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      ok({
        movimentacoes: [{ data: "2026-01-01", descricao: "Pgto", valor: 10, tipo: "CREDITO" }],
      }),
    );
    expect((await fetchPortalExtrato()).movimentacoes[0].descricao).toBe("Pgto");
    vi.mocked(api.get).mockResolvedValueOnce(
      ok({ content: [{ documentoId: "doc1", tipo: "COMPROVANTE" }] }),
    );
    expect((await listarDocumentos(0, 10))[0].id).toBe("doc1");
    const arquivo = new File(["x"], "a.pdf", { type: "application/pdf" });
    vi.mocked(api.post).mockResolvedValueOnce(ok({ id: "doc2", tipo: "OUTRO" }));
    expect(
      (
        await uploadDocumento({
          arquivo,
          tipo: "OUTRO",
          dividaId: "d1",
          observacao: "nota",
        })
      ).id,
    ).toBe("doc2");
    expect(downloadDocumentoUrl("doc1")).toBe("/api/portal/documentos/doc1/download");

    globalThis.URL.createObjectURL = vi.fn(() => "blob:x");
    globalThis.URL.revokeObjectURL = vi.fn();
    const click = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
    vi.mocked(api.get).mockResolvedValueOnce(ok(new Blob(["x"])));
    await baixarDocumento("doc1", "a.pdf");
    expect(click).toHaveBeenCalled();
  });
});
