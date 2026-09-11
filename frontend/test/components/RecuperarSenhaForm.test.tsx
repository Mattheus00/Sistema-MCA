import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RecuperarSenhaForm from "@/components/auth/RecuperarSenhaForm";
import * as authApi from "@/lib/authApi";

vi.mock("@/lib/authApi", () => ({
  solicitarRedefinicao: vi.fn(),
}));

describe("RecuperarSenhaForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.solicitarRedefinicao).mockResolvedValue({
      mensagem: "Se a conta tiver e-mail cadastrado, você receberá um link.",
    });
  });

  it("solicita redefinição com o login informado", async () => {
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
      expect(authApi.solicitarRedefinicao).toHaveBeenCalledWith("claudia");
    });
    expect(await screen.findByText(/e-mail cadastrado/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /voltar para login/i }));
    expect(onConcluido).toHaveBeenCalled();
  });
});
