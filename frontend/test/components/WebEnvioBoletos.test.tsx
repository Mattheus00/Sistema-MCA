import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WebEnvioBoletos from "@/components/pages/WebEnvioBoletos";
import * as envioBoletosApi from "@/lib/envioBoletosApi";

vi.mock("@/lib/envioBoletosApi", () => ({
  criarLoteEnvioBoletos: vi.fn(),
  consultarLoteEnvioBoletos: vi.fn(),
  validarLoteEnvioBoletos: vi.fn(),
  enviarLoteEnvioBoletos: vi.fn(),
  atualizarClienteItem: vi.fn(),
  confirmarItemEnvioBoleto: vi.fn(),
  ignorarItemEnvioBoleto: vi.fn(),
  abrirPdfItem: vi.fn(),
  baixarRelatorioCsv: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },
    isMockEnabled: vi.fn(() => false),
    normalizeListResponse: actual.normalizeListResponse,
  };
});

import type { LoteEnvioBoleto } from "@/types/api";

const loteMock: LoteEnvioBoleto = {
  loteId: "lote-1",
  status: "CONFERENCIA",
  quantidadeTotal: 2,
  quantidadeIdentificada: 2,
  quantidadePendente: 1,
  itens: [
    {
      envioBoletoId: "i1",
      itemId: "i1",
      nomeArquivoOriginal: "4 ANA CLAUDIA DE CARVALHO BOTELHO.pdf",
      clienteNome: "Cliente A",
      documentoMascarado: "***.***.901-01",
      emailDestinatario: "a@test.com",
      metodoIdentificacao: "CODIGO_CLIENTE",
      confiancaIdentificacao: "ALTA",
      status: "PRONTO_PARA_ENVIO",
    },
    {
      envioBoletoId: "i2",
      itemId: "i2",
      nomeArquivoOriginal: "boleto-bloqueado.pdf",
      clienteNome: "Cliente B",
      emailDestinatario: "",
      status: "AGUARDANDO_CORRECAO",
      confiancaIdentificacao: "BAIXA",
      bloqueado: true,
    },
  ],
  resumo: {
    semEmail: 1,
    prontosParaEnvio: 1,
    ignorados: 0,
  },
  validacao: {
    podeEnviar: false,
    bloqueios: [{ itemId: "i2", motivo: "Sem e-mail" }],
  },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <WebEnvioBoletos />
    </MemoryRouter>
  );
}

describe("WebEnvioBoletos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe tabela de conferência com campos mapeados da API após upload", async () => {
    vi.mocked(envioBoletosApi.criarLoteEnvioBoletos).mockResolvedValueOnce(loteMock);
    vi.mocked(envioBoletosApi.validarLoteEnvioBoletos).mockResolvedValueOnce(loteMock);

    renderPage();

    const input = document.querySelector('input[type="file"]:not([webkitdirectory])') as HTMLInputElement;
    const file = new File(["pdf"], "4 ANA CLAUDIA DE CARVALHO BOTELHO.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/1 arquivo selecionado/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /analisar arquivos/i }));

    await waitFor(() => {
      expect(screen.getByText("4 ANA CLAUDIA DE CARVALHO BOTELHO.pdf")).toBeInTheDocument();
      expect(screen.getByText("Cliente A")).toBeInTheDocument();
      expect(screen.getByText("***.***.901-01")).toBeInTheDocument();
      expect(screen.getByText("a@test.com")).toBeInTheDocument();
      expect(screen.getByText(/conferência dos boletos/i)).toBeInTheDocument();
    });
  });

  it("mantém botão Enviar e-mails desabilitado sem itens prontos", async () => {
    const loteSemProntos = {
      ...loteMock,
      quantidadePendente: 2,
      itens: [loteMock.itens![1]],
      resumo: { semEmail: 1, prontosParaEnvio: 0, ignorados: 0 },
      validacao: { podeEnviar: false, bloqueios: [{ itemId: "i2", motivo: "Sem e-mail" }] },
    };
    vi.mocked(envioBoletosApi.criarLoteEnvioBoletos).mockResolvedValueOnce(loteSemProntos);
    vi.mocked(envioBoletosApi.validarLoteEnvioBoletos).mockResolvedValueOnce(loteSemProntos);

    renderPage();

    const input = document.querySelector('input[type="file"]:not([webkitdirectory])') as HTMLInputElement;
    const file = new File(["pdf"], "boleto-bloqueado.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /analisar arquivos/i }));

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /enviar e-mails/i });
      expect(btn).toBeDisabled();
    });
  });

  it("modal exibe selecionados e prontos alinhados por envioBoletoId", async () => {
    const loteLiberado = {
      ...loteMock,
      quantidadePendente: 0,
      itens: [
        { ...loteMock.itens![0], envioBoletoId: "uuid-1", itemId: "uuid-1" },
        { ...loteMock.itens![0], envioBoletoId: "uuid-2", itemId: "uuid-2", nomeArquivoOriginal: "outro.pdf" },
      ],
      validacao: { podeEnviar: true, bloqueios: [] },
    };
    vi.mocked(envioBoletosApi.criarLoteEnvioBoletos).mockResolvedValueOnce(loteLiberado);
    vi.mocked(envioBoletosApi.validarLoteEnvioBoletos).mockResolvedValueOnce(loteLiberado);

    renderPage();

    const input = document.querySelector('input[type="file"]:not([webkitdirectory])') as HTMLInputElement;
    const file = new File(["pdf"], "boleto-ok.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /analisar arquivos/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /enviar e-mails/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /enviar e-mails/i }));

    await waitFor(() => {
      const valores = screen.getAllByText("2");
      expect(valores.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("abre modal de confirmação quando envio é permitido", async () => {
    const loteLiberado = {
      ...loteMock,
      quantidadePendente: 0,
      itens: [loteMock.itens![0]],
      validacao: { podeEnviar: true, bloqueios: [] },
    };
    vi.mocked(envioBoletosApi.criarLoteEnvioBoletos).mockResolvedValueOnce(loteLiberado);
    vi.mocked(envioBoletosApi.validarLoteEnvioBoletos).mockResolvedValueOnce(loteLiberado);

    renderPage();

    const input = document.querySelector('input[type="file"]:not([webkitdirectory])') as HTMLInputElement;
    const file = new File(["pdf"], "boleto-ok.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /analisar arquivos/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /enviar e-mails/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /enviar e-mails/i }));
    expect(screen.getByText(/atenção:/i)).toBeInTheDocument();
    expect(screen.getByText(/resumo do envio/i)).toBeInTheDocument();
  });
});
