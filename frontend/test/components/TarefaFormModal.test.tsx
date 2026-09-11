import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TarefaFormModal from "@/components/tarefas/TarefaFormModal";
import type { ResponsavelTarefa } from "@/types/tarefas";

vi.mock("@/lib/clientesApi", () => ({
  listarClientes: vi.fn().mockResolvedValue([]),
}));

const responsaveis: ResponsavelTarefa[] = [
  { id: "u-prop", nome: "Claudia", perfil: "PROPRIETARIA" },
  { id: "u-func", nome: "João", perfil: "FUNCIONARIO" },
];

function preencherTituloESalvar() {
  fireEvent.change(screen.getByPlaceholderText(/validar proposta do cliente/i), {
    target: { value: "Conferir honorários" },
  });
  fireEvent.click(screen.getByRole("button", { name: /criar tarefa/i }));
}

describe("TarefaFormModal — payload de criação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gestor em Minhas tarefas envia responsavelId igual ao usuário logado", async () => {
    const onSalvar = vi.fn().mockResolvedValue(undefined);

    render(
      <TarefaFormModal
        aberto
        modo="criar"
        responsaveis={responsaveis}
        podeEscolherResponsavel
        responsavelPadraoId="u-prop"
        salvando={false}
        onFechar={() => undefined}
        onSalvar={onSalvar}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/responsável/i)).toHaveValue("u-prop");
    });

    preencherTituloESalvar();

    await waitFor(() => {
      expect(onSalvar).toHaveBeenCalledTimes(1);
    });
    const payload = onSalvar.mock.calls[0]?.[0];
    expect(payload?.responsavelId).toBe("u-prop");
  });

  it("FUNCIONARIO não envia responsavelId no payload", async () => {
    const onSalvar = vi.fn().mockResolvedValue(undefined);

    render(
      <TarefaFormModal
        aberto
        modo="criar"
        responsaveis={responsaveis}
        podeEscolherResponsavel={false}
        salvando={false}
        onFechar={() => undefined}
        onSalvar={onSalvar}
      />,
    );

    expect(screen.getByLabelText(/responsável/i)).toHaveAttribute("readonly");

    preencherTituloESalvar();

    await waitFor(() => {
      expect(onSalvar).toHaveBeenCalledTimes(1);
    });
    const payload = onSalvar.mock.calls[0]?.[0];
    expect(payload).not.toHaveProperty("responsavelId");
  });
});
