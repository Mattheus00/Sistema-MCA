import { describe, it, expect, vi } from "vitest";
import type { Inadimplencia } from "@/types/api";
import {
  EMPRESA_COBRANCA,
  buildAvisoPendenciaHtml,
  fetchPixQrCodeDataUrl,
} from "@/lib/avisoPendenciaHtml";

function divida(partial: Partial<Inadimplencia> = {}): Inadimplencia {
  return {
    id: partial.id ?? "1",
    clienteId: partial.clienteId ?? "c1",
    valor: partial.valor ?? 1500,
    vencimento: partial.vencimento ?? "2026-03-15",
    descricao: partial.descricao,
    ...partial,
  };
}

describe("avisoPendenciaHtml", () => {
  it("exige ao menos uma dívida", () => {
    expect(() => buildAvisoPendenciaHtml({ itens: [], nomeCliente: "Ana" })).toThrow(
      /ao menos uma dívida/i,
    );
  });

  it("monta HTML de um período e escapa HTML", () => {
    const html = buildAvisoPendenciaHtml({
      itens: [divida({ descricao: `<script>x</script>`, valor: 100 })],
      nomeCliente: `Maria <b>X</b>`,
      qrCodeSrc: "data:image/png;base64,abc",
    });
    expect(html).toContain("Aviso de Pendência Financeira");
    expect(html).toContain("Maria &lt;b&gt;X&lt;/b&gt;");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(html).toContain(EMPRESA_COBRANCA.email);
    expect(html).toContain("data:image/png;base64,abc");
    expect(html).toContain("Vencimento");
  });

  it("usa descrição padrão e pluraliza vários períodos", () => {
    const html = buildAvisoPendenciaHtml({
      itens: [
        divida({ id: "1", vencimento: "2026-02-01", descricao: "  " }),
        divida({ id: "2", vencimento: "2026-01-01", valor: 200 }),
      ],
      nomeCliente: "João",
    });
    expect(html).toContain("Honorários / serviços contábeis");
    expect(html).toContain("1º vencimento");
    expect(html).toContain("2 períodos");
  });

  it("busca QR Code como data URL e faz fallback", async () => {
    class MockReader {
      result: string | ArrayBuffer | null = "data:image/png;base64,ok";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.onload?.();
      }
    }
    vi.stubGlobal("FileReader", MockReader);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(["qr"])),
      }),
    );
    await expect(fetchPixQrCodeDataUrl(120)).resolves.toContain("data:image/png");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );
    await expect(fetchPixQrCodeDataUrl()).resolves.toMatch(/^https?:|^data:|qr/i);

    vi.unstubAllGlobals();
  });
});
