import { describe, it, expect } from "vitest";
import { escapeHtml, gerarHtmlRelatorioServicos } from "@/lib/relatorioServicos";

describe("escapeHtml", () => {
  it("escapa &, <, >, aspas duplas e simples", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml('"x"')).toBe("&quot;x&quot;");
    expect(escapeHtml("'y'")).toBe("&#39;y&#39;");
  });

  it("mantém texto sem caracteres especiais", () => {
    expect(escapeHtml("BAIXA MEI")).toBe("BAIXA MEI");
    expect(escapeHtml("200,00")).toBe("200,00");
  });
});

describe("gerarHtmlRelatorioServicos", () => {
  it("retorna tabela com uma linha por serviço (nome + traço + valor)", () => {
    const servicos = [
      { titulo: "BAIXA MEI", valorPadrao: 20000 },
      { titulo: "DAS MEI", valorPadrao: 500 },
    ];
    const html = gerarHtmlRelatorioServicos(servicos);
    expect(html).toContain("<table class=\"relatorio-servicos__tabela\">");
    expect(html).toContain("<tbody>");
    expect(html).toContain("BAIXA MEI");
    expect(html).toContain("200,00");
    expect(html).toContain("DAS MEI");
    expect(html).toContain("5,00");
    expect(html).toContain("</tbody></table>");
  });

  it("exibe — quando valorPadrao é null, undefined ou zero", () => {
    const servicos = [{ titulo: "Serviço sem valor", valorPadrao: null }];
    const html = gerarHtmlRelatorioServicos(servicos);
    expect(html).toContain("Serviço sem valor");
    expect(html).toContain("—");
  });

  it("escapa HTML no nome do serviço", () => {
    const servicos = [{ titulo: "<script>", valorPadrao: 100 }];
    const html = gerarHtmlRelatorioServicos(servicos);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("retorna tabela vazia para lista vazia", () => {
    const html = gerarHtmlRelatorioServicos([]);
    expect(html).toBe("<table class=\"relatorio-servicos__tabela\"><tbody></tbody></table>");
  });
});
