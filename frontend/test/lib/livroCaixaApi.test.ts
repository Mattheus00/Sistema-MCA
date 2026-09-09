import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AxiosResponse } from "axios";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
    isMockEnabled: vi.fn(() => false),
    getAuthToken: vi.fn(() => null),
  };
});

import { api, getAuthToken, isMockEnabled } from "@/lib/api";
import {
  normalizeMovimentacaoFromApi,
  normalizeMovimentacaoDetalheFromApi,
  normalizePaginaMovimentacoesFromApi,
  normalizeDashboardFromApi,
  normalizeCategoriaFromApi,
  normalizeContaFromApi,
  normalizeAnaliseFromApi,
  normalizeRelatorioFromApi,
  obterDashboardLivroCaixa,
  listarMovimentacoes,
  obterMovimentacao,
  criarMovimentacao,
  atualizarMovimentacao,
  receberMovimentacao,
  pagarMovimentacao,
  cancelarMovimentacao,
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  desativarCategoria,
  listarContas,
  criarConta,
  atualizarConta,
  desativarConta,
  obterAnaliseLivroCaixa,
  obterRelatorioLivroCaixa,
  enviarAnexoMovimentacao,
  baixarAnexoMovimentacao,
  invalidateLivroCaixa,
  LIVRO_CAIXA_INVALIDATE_EVENT,
} from "@/lib/livroCaixaApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

const detalheRaw = {
  id: "m1",
  tipo: "ENTRADA",
  descricao: "Honorários",
  valor: 1500,
  status: "RECEBIDO",
};

describe("livroCaixaApi adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isMockEnabled).mockReturnValue(false);
    vi.mocked(getAuthToken).mockReturnValue(null);
  });

  it("normaliza movimentação com aliases e fallbacks", () => {
    const m = normalizeMovimentacaoFromApi({
      movimentacaoId: 7,
      tipo: "SAIDA",
      descricao: "Aluguel",
      valor: "99.5",
      categoria: "Despesa",
      formaPagamento: "cheque",
      status: "x",
      vencido: "true",
      editavel: "false",
    });
    expect(m.id).toBe("7");
    expect(m.tipo).toBe("SAIDA");
    expect(m.categoriaNome).toBe("Despesa");
    expect(m.formaPagamento).toBe("OUTRO");
    expect(m.status).toBe("PREVISTO");
    expect(m.vencido).toBe(true);
    expect(m.editavel).toBe(false);
  });

  it("normaliza detalhe aninhado, anexos e histórico", () => {
    const d = normalizeMovimentacaoDetalheFromApi({
      movimentacao: {
        id: "m1",
        tipo: "ENTRADA",
        descricao: "Honorários",
        valor: 10,
        origem: "xyz",
        clienteId: 3,
      },
      anexos: [
        { anexoId: 1, nomeOriginal: "nota.pdf", tamanhoBytes: 2048, criadoEm: "2026-01-01" },
      ],
      historicoAlteracoes: [
        { campo: "status", valorAnterior: "PREVISTO", valorNovo: "RECEBIDO", data: "2026-01-02" },
      ],
    });
    expect(d.clienteId).toBe("3");
    expect(d.origem).toBe("OUTRO");
    expect(d.anexos[0].nomeArquivo).toBe("nota.pdf");
    expect(d.historico[0].detalhes).toContain("PREVISTO");
  });

  it("normaliza página, dashboard, categoria, conta, análise e relatório", () => {
    const pagina = normalizePaginaMovimentacoesFromApi({
      content: [{ id: "1", tipo: "ENTRADA", descricao: "X", valor: 1 }],
      totalElements: 1,
    });
    expect(pagina.content[0].id).toBe("1");
    expect(normalizeDashboardFromApi({ saldoRealizado: "10" }).saldoRealizado).toBe(10);
    expect(
      normalizeCategoriaFromApi({ categoriaId: 1, nome: "A", tipo: "ENTRADA", ativo: false }).ativa,
    ).toBe(false);
    expect(normalizeContaFromApi({ contaId: 2, nome: "Caixa" }).id).toBe("2");

    const analiseLista = normalizeAnaliseFromApi({
      entradasSaidasMensais: [{ periodo: "2026-01", entradas: 10, saidas: 2 }],
      despesasPorCategoria: [{ id: "c", nome: "Aluguel", valor: 2 }],
      fluxoCaixa: [
        { saldoInicial: 5, entradas: 10, saidas: 2, saldoFinal: 8 },
        { saldoInicial: 8, totalEntradas: 1, totalSaidas: 0, saldoFinal: 9 },
      ],
    });
    expect(analiseLista.entradasSaidasMensal[0].mes).toBe("2026-01");
    expect(analiseLista.fluxoCaixa.saldoInicial).toBe(5);
    expect(analiseLista.fluxoCaixa.saldoFinal).toBe(9);

    const analiseObj = normalizeAnaliseFromApi({
      entradasSaidasMensal: [],
      fluxoCaixa: { saldoInicial: 1, entradas: 2, saidas: 1, saldoFinal: 2 },
    });
    expect(analiseObj.fluxoCaixa.totalEntradas).toBe(2);

    const rel = normalizeRelatorioFromApi({
      dataInicio: "2026-01-01",
      movimentacoes: [{ id: "1", tipo: "ENTRADA", descricao: "X", valor: 1 }],
      porCategoria: [{ nome: "Honorários", entradas: 1, saidas: 0 }],
    });
    expect(rel.porCategoria?.[0].categoriaNome).toBe("Honorários");
    expect(normalizeRelatorioFromApi({}).movimentacoes).toEqual([]);
  });

  it("chama endpoints de dashboard, lista e cadastros", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(ok({ saldoRealizado: 100 }));
    expect((await obterDashboardLivroCaixa()).saldoRealizado).toBe(100);

    vi.mocked(api.get).mockResolvedValueOnce(
      ok({ content: [{ id: "m1", tipo: "SAIDA", descricao: "Água", valor: 50 }] }),
    );
    const lista = await listarMovimentacoes({
      tipo: "SAIDA",
      status: "PREVISTO",
      categoriaId: "c1",
      contaId: "ct1",
      clienteId: "cl1",
      formaPagamento: "PIX",
      dataInicio: "2026-01-01",
      dataFim: "2026-01-31",
      valorMin: 1,
      valorMax: 99,
      busca: "água",
      sort: "valor,desc",
    });
    expect(lista.content[0].descricao).toBe("Água");

    vi.mocked(api.get).mockResolvedValueOnce(ok(detalheRaw));
    expect((await obterMovimentacao("m1")).id).toBe("m1");

    vi.mocked(api.post).mockResolvedValueOnce(ok(detalheRaw));
    expect(
      (
        await criarMovimentacao({
          tipo: "ENTRADA",
          descricao: "Honorários",
          valor: 1500,
          categoriaId: "h1",
          dataMovimentacao: "2026-09-01",
          status: "RECEBIDO",
        })
      ).descricao,
    ).toBe("Honorários");

    vi.mocked(api.put).mockResolvedValueOnce(ok({ ...detalheRaw, descricao: "Atualizada" }));
    expect((await atualizarMovimentacao("m1", { descricao: "Atualizada" })).descricao).toBe(
      "Atualizada",
    );

    vi.mocked(api.patch).mockResolvedValueOnce(ok({}));
    vi.mocked(api.get).mockResolvedValueOnce(ok(detalheRaw));
    expect((await receberMovimentacao("m1", { dataPagamento: "2026-09-15" })).id).toBe("m1");

    vi.mocked(api.patch).mockResolvedValueOnce(ok({}));
    vi.mocked(api.get).mockResolvedValueOnce(ok({ ...detalheRaw, tipo: "SAIDA", status: "PAGO" }));
    expect((await pagarMovimentacao("m1", { dataPagamento: "2026-09-15" })).status).toBe("PAGO");

    vi.mocked(api.patch).mockResolvedValueOnce(ok({}));
    vi.mocked(api.get).mockResolvedValueOnce(ok({ ...detalheRaw, status: "CANCELADO" }));
    expect((await cancelarMovimentacao("m1")).status).toBe("CANCELADO");

    vi.mocked(api.get).mockResolvedValueOnce(
      ok([{ id: "c1", nome: "Honorários", tipo: "ENTRADA" }]),
    );
    expect((await listarCategorias(true))[0].nome).toBe("Honorários");
    expect(vi.mocked(api.get).mock.calls.at(-1)?.[1]).toEqual({ params: { ativas: true } });

    vi.mocked(api.get).mockResolvedValueOnce(ok([]));
    await listarCategorias(false);
    expect(vi.mocked(api.get).mock.calls.at(-1)?.[1]).toEqual({ params: {} });

    vi.mocked(api.post).mockResolvedValueOnce(ok({ id: "c2", nome: "Nova", tipo: "SAIDA" }));
    expect((await criarCategoria({ nome: "Nova", tipo: "SAIDA" })).id).toBe("c2");
    vi.mocked(api.put).mockResolvedValueOnce(ok({ id: "c2", nome: "N", tipo: "SAIDA" }));
    expect((await atualizarCategoria("c2", { nome: "N", tipo: "SAIDA" })).nome).toBe("N");
    vi.mocked(api.patch).mockResolvedValueOnce(ok({}));
    await desativarCategoria("c2");

    vi.mocked(api.get).mockResolvedValueOnce(ok([{ id: "ct", nome: "Caixa" }]));
    expect((await listarContas())[0].nome).toBe("Caixa");
    vi.mocked(api.post).mockResolvedValueOnce(ok({ id: "ct2", nome: "Banco" }));
    expect((await criarConta({ nome: "Banco" })).nome).toBe("Banco");
    vi.mocked(api.put).mockResolvedValueOnce(ok({ id: "ct2", nome: "BB" }));
    expect((await atualizarConta("ct2", { nome: "BB" })).nome).toBe("BB");
    vi.mocked(api.patch).mockResolvedValueOnce(ok({}));
    await desativarConta("ct2");

    vi.mocked(api.get).mockResolvedValueOnce(ok({ fluxoCaixa: { saldoFinal: 3 } }));
    expect((await obterAnaliseLivroCaixa("2026-01-01", "2026-01-31")).fluxoCaixa.saldoFinal).toBe(
      3,
    );
    vi.mocked(api.get).mockResolvedValueOnce(ok({ saldoFinal: 9, movimentacoes: [] }));
    expect((await obterRelatorioLivroCaixa("2026-01-01", "2026-01-31")).saldoFinal).toBe(9);

    vi.mocked(api.post).mockResolvedValueOnce(ok({}));
    vi.mocked(api.get).mockResolvedValueOnce(ok(detalheRaw));
    const arquivo = new File(["x"], "nota.pdf", { type: "application/pdf" });
    expect((await enviarAnexoMovimentacao("m1", arquivo)).id).toBe("m1");
  });

  it("baixa anexo via fetch autenticado e via mock", async () => {
    const click = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);
    globalThis.URL.createObjectURL = vi.fn(() => "blob:x");
    globalThis.URL.revokeObjectURL = vi.fn();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["pdf"])),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(getAuthToken).mockReturnValue("tok");
    await baixarAnexoMovimentacao("m1", "a1", "nota.pdf");
    expect(fetchMock).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce({ ok: false });
    await expect(baixarAnexoMovimentacao("m1", "a1")).rejects.toThrow(
      "Não foi possível baixar o anexo.",
    );

    vi.mocked(isMockEnabled).mockReturnValue(true);
    vi.mocked(api.get).mockResolvedValueOnce(ok(new Blob(["x"])));
    await baixarAnexoMovimentacao("m1", "a1");
    expect(vi.mocked(api.get)).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("dispara evento de invalidação", () => {
    const handler = vi.fn();
    window.addEventListener(LIVRO_CAIXA_INVALIDATE_EVENT, handler);
    invalidateLivroCaixa();
    expect(handler).toHaveBeenCalled();
    window.removeEventListener(LIVRO_CAIXA_INVALIDATE_EVENT, handler);
  });

  it("propaga erros das operações", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("dash"));
    await expect(obterDashboardLivroCaixa()).rejects.toThrow("dash");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("lista"));
    await expect(listarMovimentacoes()).rejects.toThrow("lista");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("obter"));
    await expect(obterMovimentacao("x")).rejects.toThrow("obter");
    vi.mocked(api.post).mockRejectedValueOnce(new Error("criar"));
    await expect(
      criarMovimentacao({
        tipo: "ENTRADA",
        descricao: "x",
        valor: 1,
        categoriaId: "c1",
        dataMovimentacao: "2026-01-01",
        status: "PREVISTO",
      }),
    ).rejects.toThrow("criar");
    vi.mocked(api.put).mockRejectedValueOnce(new Error("upd"));
    await expect(atualizarMovimentacao("x", { descricao: "y" })).rejects.toThrow("upd");
    vi.mocked(api.patch).mockRejectedValueOnce(new Error("rec"));
    await expect(receberMovimentacao("x", { dataPagamento: "2026-01-01" })).rejects.toThrow("rec");
    vi.mocked(api.patch).mockRejectedValueOnce(new Error("pag"));
    await expect(pagarMovimentacao("x", { dataPagamento: "2026-01-01" })).rejects.toThrow("pag");
    vi.mocked(api.patch).mockRejectedValueOnce(new Error("can"));
    await expect(cancelarMovimentacao("x")).rejects.toThrow("can");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("cat"));
    await expect(listarCategorias()).rejects.toThrow("cat");
    vi.mocked(api.post).mockRejectedValueOnce(new Error("ccat"));
    await expect(criarCategoria({ nome: "n", tipo: "ENTRADA" })).rejects.toThrow("ccat");
    vi.mocked(api.put).mockRejectedValueOnce(new Error("ucat"));
    await expect(atualizarCategoria("x", { nome: "n", tipo: "ENTRADA" })).rejects.toThrow("ucat");
    vi.mocked(api.patch).mockRejectedValueOnce(new Error("dcat"));
    await expect(desativarCategoria("x")).rejects.toThrow("dcat");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("cts"));
    await expect(listarContas()).rejects.toThrow("cts");
    vi.mocked(api.post).mockRejectedValueOnce(new Error("cct"));
    await expect(criarConta({ nome: "n" })).rejects.toThrow("cct");
    vi.mocked(api.put).mockRejectedValueOnce(new Error("uct"));
    await expect(atualizarConta("x", { nome: "n" })).rejects.toThrow("uct");
    vi.mocked(api.patch).mockRejectedValueOnce(new Error("dct"));
    await expect(desativarConta("x")).rejects.toThrow("dct");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("an"));
    await expect(obterAnaliseLivroCaixa("a", "b")).rejects.toThrow("an");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("rel"));
    await expect(obterRelatorioLivroCaixa("a", "b")).rejects.toThrow("rel");
    vi.mocked(api.post).mockRejectedValueOnce(new Error("anexo"));
    await expect(enviarAnexoMovimentacao("x", new File(["x"], "a.pdf"))).rejects.toThrow("anexo");
  });
});

describe("livroCaixaApi cleanup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("restaura spies", () => {
    expect(true).toBe(true);
  });
});
