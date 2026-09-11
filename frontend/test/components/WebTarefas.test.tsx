import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WebTarefas from "@/components/pages/WebTarefas";
import { setAuthSession } from "@/lib/api";
import * as tarefasApi from "@/lib/tarefasApi";
import type { TarefaResumo } from "@/types/tarefas";

vi.mock("@/lib/clientesApi", () => ({
  listarClientes: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/tarefasApi", () => ({
  atualizarTarefa: vi.fn(),
  criarTarefa: vi.fn(),
  listarResponsaveisTarefas: vi.fn(),
  listarTarefas: vi.fn(),
  obterIndicadoresTarefas: vi.fn(),
  obterKanbanTarefas: vi.fn(),
  obterResumoColaboradores: vi.fn(),
  obterTarefa: vi.fn(),
  moverTarefa: vi.fn(),
  adicionarChecklistItem: vi.fn(),
  removerChecklistItem: vi.fn(),
  toggleChecklistItem: vi.fn(),
}));

const tarefa: TarefaResumo = {
  id: "t1",
  titulo: "Revisar balanço",
  status: "A_FAZER",
  prioridade: "ALTA",
  atrasada: false,
  checklistConcluidos: 0,
  checklistTotal: 0,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <WebTarefas />
    </MemoryRouter>,
  );
}

describe("WebTarefas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(tarefasApi.obterIndicadoresTarefas).mockResolvedValue({
      emAberto: 3,
      emAndamento: 1,
      atrasadas: 0,
      concluidasNaSemana: 2,
    });
    vi.mocked(tarefasApi.obterKanbanTarefas).mockResolvedValue({
      colunas: [
        { status: "A_FAZER", tarefas: [tarefa], total: 1 },
        { status: "EM_ANDAMENTO", tarefas: [], total: 0 },
        { status: "EM_REVISAO", tarefas: [], total: 0 },
        { status: "CONCLUIDO", tarefas: [], total: 0 },
      ],
    });
    vi.mocked(tarefasApi.listarResponsaveisTarefas).mockResolvedValue([]);
    vi.mocked(tarefasApi.listarTarefas).mockResolvedValue({
      content: [tarefa],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
    });
  });

  it("renderiza o quadro com tarefa mockada", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /gestão de tarefas/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Revisar balanço")).toBeInTheDocument();
    });
    expect(screen.getByText("Em aberto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nova tarefa/i })).toBeInTheDocument();
  });

  it("gestor em Minhas tarefas vê o select de responsável pré-selecionado", async () => {
    setAuthSession(
      {
        token: "tok",
        display: "Claudia",
        login: "claudia",
        profile: "PROPRIETARIA",
        usuarioId: "u-prop",
      },
      true,
    );
    vi.mocked(tarefasApi.listarResponsaveisTarefas).mockResolvedValue([
      { id: "u-prop", nome: "Claudia", perfil: "PROPRIETARIA" },
      { id: "u-func", nome: "João", perfil: "FUNCIONARIO" },
    ]);

    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /minhas tarefas/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /nova tarefa/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /nova tarefa/i })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Claudia" })).toBeInTheDocument();
      expect(screen.getByLabelText(/responsável/i)).toHaveValue("u-prop");
    });
    expect(screen.getByLabelText(/responsável/i).tagName).toBe("SELECT");
  });
});
