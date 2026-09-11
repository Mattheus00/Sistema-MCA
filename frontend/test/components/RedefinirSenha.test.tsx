import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RedefinirSenha from "@/components/pages/RedefinirSenha";
import * as authApi from "@/lib/authApi";

vi.mock("@/lib/authApi", () => ({
  confirmarRedefinicao: vi.fn(),
}));

function renderPagina(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/redefinir-senha?token=${encodeURIComponent(token)}`]}>
      <Routes>
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/login" element={<p>Login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RedefinirSenha", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.confirmarRedefinicao).mockResolvedValue({
      mensagem: "Senha alterada com sucesso.",
    });
  });

  it("envia token da URL com a nova senha", async () => {
    renderPagina("abc-token");

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "nova1234" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "nova1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(authApi.confirmarRedefinicao).toHaveBeenCalledWith({
        token: "abc-token",
        novaSenha: "nova1234",
        confirmarSenha: "nova1234",
      });
    });
    expect(await screen.findByText("Senha alterada com sucesso.")).toBeInTheDocument();
  });

  it("mostra erro quando o token está ausente", () => {
    render(
      <MemoryRouter initialEntries={["/redefinir-senha"]}>
        <Routes>
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/link inválido ou expirado/i);
  });
});
