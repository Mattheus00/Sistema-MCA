import { describe, it, expect, vi, beforeEach } from "vitest";
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
  };
});

import { api } from "@/lib/api";
import {
  normalizeTarefaFromApi,
  normalizeTarefaDetalheFromApi,
  listarTarefas,
  obterKanbanTarefas,
  obterIndicadoresTarefas,
  listarResponsaveisTarefas,
  obterResumoColaboradores,
  obterTarefa,
  criarTarefa,
  atualizarTarefa,
  moverTarefa,
  adicionarChecklistItem,
  toggleChecklistItem,
  removerChecklistItem,
} from "@/lib/tarefasApi";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: {} } as AxiosResponse<T>["config"],
  };
}

describe("tarefasApi adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normaliza tarefa com aliases e fallbacks", () => {
    const t = normalizeTarefaFromApi({
      tarefaId: 9,
      titulo: "Fechar folha",
      status: "invalido",
      prioridade: "urgente",
      atrasada: "true",
      checklistConcluidos: "2",
      checklistTotal: "",
    });
    expect(t.id).toBe("9");
    expect(t.status).toBe("A_FAZER");
    expect(t.prioridade).toBe("MEDIA");
    expect(t.atrasada).toBe(true);
    expect(t.checklistConcluidos).toBe(2);
    expect(t.checklistTotal).toBe(0);
  });

  it("normaliza detalhe com checklist e histórico alternativos", () => {
    const d = normalizeTarefaDetalheFromApi({
      id: "t1",
      titulo: "Revisar",
      status: "EM_REVISAO",
      prioridade: "ALTA",
      checklistItens: [{ itemId: 1, descricao: "Item", feito: true, ordem: 2 }],
      historicoAlteracoes: [
        { data: "2026-01-01", usuarioNome: "Ana", tipo: "CRIOU", descricao: "ok" },
      ],
      observacoes: "obs",
    });
    expect(d.checklist[0]).toMatchObject({ id: "1", concluido: true, ordem: 2 });
    expect(d.historico[0]).toMatchObject({
      usuario: "Ana",
      acao: "CRIOU",
      detalhes: "ok",
    });
  });

  it("lista tarefas paginadas e indicadores", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      ok({
        content: [{ id: "1", titulo: "A", status: "A_FAZER", prioridade: "BAIXA" }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      }),
    );
    const pagina = await listarTarefas({
      visaoEquipe: true,
      responsavelId: "u1",
      status: "A_FAZER",
      prioridade: "ALTA",
      categoria: "Fiscal",
      busca: "folha",
      dataInicio: "2026-01-01",
      dataFim: "2026-01-31",
      page: 1,
      size: 10,
      sort: "titulo,asc",
    });
    expect(pagina.content[0].titulo).toBe("A");
    expect(pagina.totalElements).toBe(1);
    expect(vi.mocked(api.get).mock.calls[0][0]).toBe("/api/tarefas");

    vi.mocked(api.get).mockResolvedValueOnce(ok({ emAberto: "3", emAndamento: 1 }));
    const ind = await obterIndicadoresTarefas({ visaoEquipe: true });
    expect(ind.emAberto).toBe(3);
    expect(ind.atrasadas).toBe(0);
  });

  it("normaliza kanban nos formatos lista, colunas e mapa", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      ok([
        { id: "b1", titulo: "Backlog", status: "BACKLOG", prioridade: "BAIXA" },
        { id: "a1", titulo: "Fazer", status: "A_FAZER", prioridade: "MEDIA" },
        { titulo: "sem id", status: "A_FAZER" },
      ]),
    );
    const lista = await obterKanbanTarefas();
    const aFazer = lista.colunas.find((c) => c.status === "A_FAZER");
    expect(aFazer?.tarefas.map((t) => t.id)).toEqual(["b1", "a1"]);
    expect(lista.colunas.some((c) => c.status === "BACKLOG")).toBe(false);

    vi.mocked(api.get).mockResolvedValueOnce(
      ok([
        {
          status: "EM_ANDAMENTO",
          items: [{ id: "e1", titulo: "Andando", status: "EM_ANDAMENTO" }],
          total: 9,
        },
      ]),
    );
    const cols = await obterKanbanTarefas();
    expect(cols.colunas.find((c) => c.status === "EM_ANDAMENTO")?.tarefas[0].id).toBe("e1");

    vi.mocked(api.get).mockResolvedValueOnce(
      ok({
        colunas: {
          CONCLUIDO: { content: [{ id: "c1", titulo: "Ok", status: "CONCLUIDO" }], total: 1 },
        },
      }),
    );
    const mapa = await obterKanbanTarefas();
    expect(mapa.colunas.find((c) => c.status === "CONCLUIDO")?.tarefas[0].id).toBe("c1");

    vi.mocked(api.get).mockResolvedValueOnce(ok({ colunas: [] }));
    const vazio = await obterKanbanTarefas();
    expect(vazio.colunas).toHaveLength(4);

    vi.mocked(api.get).mockResolvedValueOnce(ok(null));
    const nulo = await obterKanbanTarefas();
    expect(nulo.colunas.every((c) => c.tarefas.length === 0)).toBe(true);

    vi.mocked(api.get).mockResolvedValueOnce(ok({ foo: 1 }));
    const desconhecido = await obterKanbanTarefas();
    expect(desconhecido.colunas).toHaveLength(4);
  });

  it("mapeia responsáveis, resumo e CRUD", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(
      ok([{ usuarioId: 2, responsavelNome: "João", perfil: "FUNCIONARIO" }]),
    );
    const resp = await listarResponsaveisTarefas();
    expect(resp[0]).toMatchObject({ id: "2", nome: "João" });

    vi.mocked(api.get).mockResolvedValueOnce(
      ok([{ usuarioId: "u", nome: "Maria", totalTarefas: 4, emAberto: 1 }]),
    );
    const resumo = await obterResumoColaboradores({ busca: "ma" });
    expect(resumo[0].responsavelNome).toBe("Maria");
    expect(resumo[0].total).toBe(4);

    vi.mocked(api.get).mockResolvedValueOnce(ok({ id: "t1", titulo: "Detalhe", checklist: [] }));
    expect((await obterTarefa("t1")).titulo).toBe("Detalhe");

    vi.mocked(api.post).mockResolvedValueOnce(ok({ id: "n1", titulo: "Nova" }));
    expect((await criarTarefa({ titulo: "Nova", status: "A_FAZER", prioridade: "MEDIA" })).id).toBe(
      "n1",
    );

    vi.mocked(api.put).mockResolvedValueOnce(ok({ id: "t1", titulo: "Editada" }));
    expect((await atualizarTarefa("t1", { titulo: "Editada" })).titulo).toBe("Editada");

    vi.mocked(api.patch).mockResolvedValueOnce(ok({ id: "t1", status: "CONCLUIDO" }));
    expect((await moverTarefa("t1", { status: "CONCLUIDO" })).status).toBe("CONCLUIDO");

    vi.mocked(api.post).mockResolvedValueOnce(
      ok({ id: "t1", checklist: [{ id: "i1", descricao: "x", concluido: false }] }),
    );
    expect((await adicionarChecklistItem("t1", "x")).checklist).toHaveLength(1);

    vi.mocked(api.patch).mockResolvedValueOnce(
      ok({ id: "t1", checklist: [{ id: "i1", descricao: "x", concluido: true }] }),
    );
    expect((await toggleChecklistItem("t1", "i1")).checklist[0].concluido).toBe(true);

    vi.mocked(api.delete).mockResolvedValueOnce(ok({ id: "t1", checklist: [] }));
    expect((await removerChecklistItem("t1", "i1"))?.checklist).toEqual([]);

    vi.mocked(api.delete).mockResolvedValueOnce(ok(undefined));
    await expect(removerChecklistItem("t1", "i1")).resolves.toBeUndefined();
  });

  it("propaga erros da API com mensagem", async () => {
    vi.mocked(api.get).mockRejectedValueOnce({ response: { data: { message: "falhou" } } });
    await expect(listarTarefas()).rejects.toThrow("falhou");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("kanban down"));
    await expect(obterKanbanTarefas()).rejects.toThrow("kanban down");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("ind"));
    await expect(obterIndicadoresTarefas()).rejects.toThrow("ind");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("resp"));
    await expect(listarResponsaveisTarefas()).rejects.toThrow("resp");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("resumo"));
    await expect(obterResumoColaboradores()).rejects.toThrow("resumo");
    vi.mocked(api.get).mockRejectedValueOnce(new Error("obter"));
    await expect(obterTarefa("x")).rejects.toThrow("obter");
    vi.mocked(api.post).mockRejectedValueOnce(new Error("criar"));
    await expect(
      criarTarefa({ titulo: "x", status: "A_FAZER", prioridade: "MEDIA" }),
    ).rejects.toThrow("criar");
    vi.mocked(api.put).mockRejectedValueOnce(new Error("upd"));
    await expect(atualizarTarefa("x", { titulo: "x" })).rejects.toThrow("upd");
    vi.mocked(api.patch).mockRejectedValueOnce(new Error("mover"));
    await expect(moverTarefa("x", { status: "A_FAZER" })).rejects.toThrow("mover");
    vi.mocked(api.post).mockRejectedValueOnce(new Error("check"));
    await expect(adicionarChecklistItem("x", "y")).rejects.toThrow("check");
    vi.mocked(api.patch).mockRejectedValueOnce(new Error("toggle"));
    await expect(toggleChecklistItem("x", "y")).rejects.toThrow("toggle");
    vi.mocked(api.delete).mockRejectedValueOnce(new Error("del"));
    await expect(removerChecklistItem("x", "y")).rejects.toThrow("del");
  });
});
