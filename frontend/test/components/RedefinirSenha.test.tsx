import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RedefinirSenha from "@/components/pages/RedefinirSenha";
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
    vi.mocked(api.post).mockResolvedValue({
      data: { mensagem: "Senha alterada com sucesso." },
    });
  });

  it("envia token da URL com a nova senha no endpoint novo", async () => {
    renderPagina("abc-token");

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "nova1234" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "nova1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar nova senha/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/auth/recuperar-senha/redefinir", {
        token: "abc-token",
        novaSenha: "nova1234",
        confirmarSenha: "nova1234",
      });
    });
    expect(await screen.findByText("Senha alterada com sucesso.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /senha alterada/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir para o login/i })).toHaveAttribute("href", "/login");
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
    expect(screen.getByRole("link", { name: /ir para o login/i })).toHaveAttribute("href", "/login");
  });
});
