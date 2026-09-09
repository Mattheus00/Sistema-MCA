import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import WebInadimplentesHonorarios from "@/components/pages/WebInadimplentesHonorarios";
import * as clientesApi from "@/lib/clientesApi";
import * as inadimplentesApi from "@/lib/inadimplentesApi";

vi.mock("@/lib/clientesApi", () => ({
  obterCliente: vi.fn(),
}));

vi.mock("@/lib/inadimplentesApi", () => ({
  listarInadimplentes: vi.fn(),
  cancelarInadimplencia: vi.fn(),
}));

function renderPage(clienteId = "c1") {
  return render(
    <MemoryRouter initialEntries={[`/inadimplentes/${clienteId}`]}>
      <Routes>
        <Route path="/inadimplentes/:clienteId" element={<WebInadimplentesHonorarios />} />
        <Route path="/inadimplentes" element={<div>Lista inadimplentes</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WebInadimplentesHonorarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientesApi.obterCliente).mockResolvedValue({
      id: "c1",
      nome: "Cliente Honorários",
      email: "cliente@test.com",
      cpf: "12345678900",
    });
    vi.mocked(inadimplentesApi.listarInadimplentes).mockResolvedValue([
      {
        id: "d1",
        clienteId: "c1",
        clienteNome: "Cliente Honorários",
        valor: 1500,
        vencimento: "2026-03-15",
        descricao: "Honorários março",
        status: "EmAberto",
      },
      {
        id: "d2",
        clienteId: "outro",
        valor: 999,
        vencimento: "2026-03-01",
        status: "EmAberto",
      },
    ]);
  });

  it("exibe aviso quando o cliente não está na rota", () => {
    render(
      <MemoryRouter initialEntries={["/inadimplentes/"]}>
        <Routes>
          <Route path="/inadimplentes/" element={<WebInadimplentesHonorarios />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/cliente não informado/i)).toBeInTheDocument();
  });

  it("renderiza honorários mockados do cliente", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /honorários em aberto/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Cliente Honorários")).toBeInTheDocument();
      const tabela = within(screen.getByRole("table"));
      expect(tabela.getByText("Honorários março")).toBeInTheDocument();
    });
    expect(screen.getByText("Detalhamento por período")).toBeInTheDocument();
  });
});
