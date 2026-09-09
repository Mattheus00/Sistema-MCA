import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { PrioridadeTarefa, StatusTarefa } from "@/types/tarefas";
import {
  STATUS_KANBAN,
  MODO_TAREFAS_STORAGE_KEY,
  labelStatusTarefa,
  labelPrioridadeTarefa,
  classeStatusTarefa,
  classePrioridadeTarefa,
  corPrioridadeCalendario,
  formatarDataTarefa,
  truncarTexto,
  progressoChecklist,
  iniciaisResponsavel,
  lerModoVisualizacaoSalvo,
  salvarModoVisualizacao,
  primeiroDiaMes,
  diasNoMes,
  labelMesAno,
  isoDataLocal,
  corFaixaCalendario,
  labelRelativoPrazo,
} from "@/lib/tarefasUtils";

describe("tarefasUtils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("expõe colunas do kanban sem backlog", () => {
    expect(STATUS_KANBAN).toEqual(["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "CONCLUIDO"]);
  });

  it("rotula status e prioridade", () => {
    expect(labelStatusTarefa("BACKLOG")).toBe("Backlog");
    expect(labelStatusTarefa("A_FAZER")).toBe("A Fazer");
    expect(labelStatusTarefa("EM_ANDAMENTO")).toBe("Em andamento");
    expect(labelStatusTarefa("EM_REVISAO")).toBe("Em revisão");
    expect(labelStatusTarefa("CONCLUIDO")).toBe("Concluído");
    expect(labelStatusTarefa("X" as StatusTarefa)).toBe("X");
    expect(labelPrioridadeTarefa("BAIXA")).toBe("Baixa");
    expect(labelPrioridadeTarefa("MEDIA")).toBe("Média");
    expect(labelPrioridadeTarefa("ALTA")).toBe("Alta");
    expect(labelPrioridadeTarefa("X" as PrioridadeTarefa)).toBe("X");
  });

  it("define classes e cores visuais", () => {
    expect(classeStatusTarefa("BACKLOG")).toContain("backlog");
    expect(classeStatusTarefa("A_FAZER")).toContain("fazer");
    expect(classeStatusTarefa("EM_ANDAMENTO")).toContain("andamento");
    expect(classeStatusTarefa("EM_REVISAO")).toContain("revisao");
    expect(classeStatusTarefa("CONCLUIDO")).toContain("concluido");
    expect(classeStatusTarefa("X" as StatusTarefa)).toBe("tarefas__badge-status");
    expect(classePrioridadeTarefa("BAIXA")).toContain("baixa");
    expect(classePrioridadeTarefa("MEDIA")).toContain("media");
    expect(classePrioridadeTarefa("ALTA")).toContain("alta");
    expect(classePrioridadeTarefa("X" as PrioridadeTarefa)).toBe("tarefas__badge-prioridade");
    expect(corPrioridadeCalendario("ALTA")).toBe("#dc2626");
    expect(corPrioridadeCalendario("MEDIA")).toBe("#ea580c");
    expect(corPrioridadeCalendario("BAIXA")).toBe("#2563eb");
    expect(corPrioridadeCalendario("X" as PrioridadeTarefa)).toBe("#64748b");
  });

  it("trunca texto, calcula progresso e iniciais", () => {
    expect(truncarTexto(undefined)).toBe("");
    expect(truncarTexto("  curto  ")).toBe("curto");
    expect(truncarTexto("a".repeat(10), 8)).toBe(`${"a".repeat(7)}…`);
    expect(progressoChecklist(1, 0)).toBe(0);
    expect(progressoChecklist(1, 2)).toBe(50);
    expect(iniciaisResponsavel()).toBe("?");
    expect(iniciaisResponsavel("Ana Silva")).toMatch(/A/);
    expect(formatarDataTarefa("2026-09-15")).toMatch(/15/);
  });

  it("persiste modo de visualização no localStorage", () => {
    expect(lerModoVisualizacaoSalvo()).toBe("kanban");
    localStorage.setItem(MODO_TAREFAS_STORAGE_KEY, "lista");
    expect(lerModoVisualizacaoSalvo()).toBe("lista");
    localStorage.setItem(MODO_TAREFAS_STORAGE_KEY, "calendario");
    expect(lerModoVisualizacaoSalvo()).toBe("calendario");
    localStorage.setItem(MODO_TAREFAS_STORAGE_KEY, "outro");
    expect(lerModoVisualizacaoSalvo()).toBe("kanban");
    salvarModoVisualizacao("lista");
    expect(localStorage.getItem(MODO_TAREFAS_STORAGE_KEY)).toBe("lista");
  });

  it("ignora falha de localStorage ao ler e salvar modo", () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(lerModoVisualizacaoSalvo()).toBe("kanban");
    getSpy.mockRestore();
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => salvarModoVisualizacao("kanban")).not.toThrow();
    setSpy.mockRestore();
  });

  it("calcula datas de calendário e prazo relativo", () => {
    const d = primeiroDiaMes(2026, 8);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(1);
    expect(diasNoMes(2026, 8)).toBe(30);
    expect(diasNoMes(2024, 1)).toBe(29);
    expect(labelMesAno(2026, 8).toLowerCase()).toContain("2026");
    expect(isoDataLocal(new Date(2026, 8, 9))).toBe("2026-09-09");

    const agora = new Date(2026, 8, 15, 10, 0, 0);
    expect(labelRelativoPrazo(undefined, agora)).toBe("Sem prazo");
    expect(labelRelativoPrazo("2026-09-15", agora)).toBe("Hoje");
    expect(labelRelativoPrazo("2026-09-16T12:00:00", agora)).toBe("Amanhã");
    expect(labelRelativoPrazo("2026-09-20", agora)).toMatch(/20/);
  });

  it("escolhe cor da faixa do calendário", () => {
    expect(corFaixaCalendario({ status: "CONCLUIDO", prioridade: "BAIXA", atrasada: true })).toBe(
      "#16a34a",
    );
    expect(corFaixaCalendario({ status: "A_FAZER", prioridade: "BAIXA", atrasada: true })).toBe(
      "#dc2626",
    );
    expect(
      corFaixaCalendario({ status: "EM_ANDAMENTO", prioridade: "BAIXA", atrasada: false }),
    ).toBe("#ea580c");
    expect(corFaixaCalendario({ status: "EM_REVISAO", prioridade: "BAIXA", atrasada: false })).toBe(
      "#7c3aed",
    );
    expect(corFaixaCalendario({ status: "A_FAZER", prioridade: "ALTA", atrasada: false })).toBe(
      "#dc2626",
    );
    expect(corFaixaCalendario({ status: "A_FAZER", prioridade: "BAIXA", atrasada: false })).toBe(
      "#2563eb",
    );
  });
});

describe("tarefasUtils timers cleanup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("não deixa spy ativo", () => {
    expect(lerModoVisualizacaoSalvo()).toBe("kanban");
  });
});
