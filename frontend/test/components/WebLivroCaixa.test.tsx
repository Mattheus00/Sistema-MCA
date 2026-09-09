import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WebLivroCaixa from "@/components/pages/WebLivroCaixa";
import * as livroCaixaApi from "@/lib/livroCaixaApi";

vi.mock("@/lib/livroCaixaApi", () => ({
  LIVRO_CAIXA_INVALIDATE_EVENT: "livro-caixa-invalidate",
  invalidateLivroCaixa: vi.fn(),
  obterDashboardLivroCaixa: vi.fn(),
  listarCategorias: vi.fn(),
  listarContas: vi.fn(),
  listarMovimentacoes: vi.fn(),
  obterMovimentacao: vi.fn(),
  obterAnaliseLivroCaixa: vi.fn(),
  obterRelatorioLivroCaixa: vi.fn(),
  criarMovimentacao: vi.fn(),
  atualizarMovimentacao: vi.fn(),
  atualizarCategoria: vi.fn(),
  atualizarConta: vi.fn(),
  criarCategoria: vi.fn(),
  criarConta: vi.fn(),
  desativarCategoria: vi.fn(),
  desativarConta: vi.fn(),
  baixarAnexoMovimentacao: vi.fn(),
  cancelarMovimentacao: vi.fn(),
  enviarAnexoMovimentacao: vi.fn(),
  pagarMovimentacao: vi.fn(),
  receberMovimentacao: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <WebLivroCaixa />
    </MemoryRouter>,
  );
}

describe("WebLivroCaixa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(livroCaixaApi.obterDashboardLivroCaixa).mockResolvedValue({
      saldoRealizado: 1500,
      saldoPrevisto: 2000,
      entradasMes: 3000,
      saidasMes: 1500,
      resultadoMes: 1500,
    });
    vi.mocked(livroCaixaApi.listarCategorias).mockResolvedValue([
      { id: "h1", nome: "Honorários contábeis", tipo: "ENTRADA", ativa: true },
    ]);
    vi.mocked(livroCaixaApi.listarContas).mockResolvedValue([
      { id: "ct1", nome: "Caixa", ativa: true },
    ]);
    vi.mocked(livroCaixaApi.listarMovimentacoes).mockResolvedValue({
      content: [
        {
          id: "m1",
          tipo: "ENTRADA",
          descricao: "Honorários abril",
          valor: 1500,
          categoriaNome: "Honorários contábeis",
          formaPagamento: "PIX",
          status: "RECEBIDO",
          dataMovimentacao: "2026-04-10",
          vencido: false,
          proximoVencimento: false,
          editavel: true,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
    });
  });

  it("renderiza dashboard e movimentação mockada", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /livro caixa/i })).toBeInTheDocument();
    await waitFor(() => {
      const tabela = within(screen.getByRole("table"));
      expect(tabela.getByText("Honorários abril")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Saldo realizado").length).toBeGreaterThan(0);
  });
});
