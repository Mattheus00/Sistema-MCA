import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "@/components/pages/Login";

vi.mock("@/lib/authApi", () => ({
  login: vi.fn(),
  registrar: vi.fn(),
  validarLoginRecuperacao: vi.fn(),
  redefinirSenha: vi.fn(),
  solicitarRedefinicao: vi.fn(),
  confirmarRedefinicao: vi.fn(),
}));

describe("Login", () => {
  it("renderiza o formulário de acesso", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /bem-vindo de volta/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
    expect(screen.getByText(/faça login para acessar o sistema/i)).toBeInTheDocument();
  });
});
