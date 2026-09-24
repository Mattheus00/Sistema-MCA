import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RecuperarSenhaForm from "@/components/auth/RecuperarSenhaForm";
import { api } from "@/lib/api";

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

const MENSAGEM_NEUTRA =
  "Se o login existir e tiver e-mail cadastrado, você receberá as instruções.";

describe("RecuperarSenhaForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({
      data: { mensagem: MENSAGEM_NEUTRA },
    });
  });

  it("solicita recuperação no endpoint novo e não chama os legados", async () => {
    const onConcluido = vi.fn();
    render(
      <MemoryRouter>
        <RecuperarSenhaForm
          loginInicial="claudia"
          onFechar={() => undefined}
          onConcluido={onConcluido}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /enviar link/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/auth/recuperar-senha/solicitar", {
        login: "claudia",
      });
    });

    const paths = vi.mocked(api.post).mock.calls.map((chamada) => chamada[0]);
    expect(paths).not.toContain("/api/auth/validar-login-recuperacao");
    expect(paths).not.toContain("/api/auth/redefinir-senha");
    expect(paths).not.toContain("/api/auth/solicitar-redefinicao");

    expect(await screen.findByText(MENSAGEM_NEUTRA)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /voltar para login/i }));
    expect(onConcluido).toHaveBeenCalledWith(MENSAGEM_NEUTRA);
  });
});
