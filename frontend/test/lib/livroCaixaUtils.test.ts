import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type {
  CategoriaLivroCaixa,
  FormaPagamento,
  OrigemMovimentacao,
  StatusMovimentacao,
} from "@/types/livroCaixa";
import {
  NOME_CATEGORIA_HONORARIOS_CONTABEIS,
  PERIODOS_RAPIDOS,
  FORMAS_PAGAMENTO,
  isCategoriaHonorariosContabeis,
  hojeIso,
  formatarDataLivroCaixa,
  formatarMesLabel,
  labelTipoMovimentacao,
  labelStatusMovimentacao,
  labelFormaPagamento,
  labelOrigemMovimentacao,
  classeBadgeStatus,
  classeValorMovimentacao,
  statusPermitidosPorTipo,
  statusEfetivado,
  calcularPeriodoRapido,
  paramsFiltroRapido,
  formatarTamanhoArquivo,
} from "@/lib/livroCaixaUtils";

const categorias: CategoriaLivroCaixa[] = [
  { id: "h1", nome: "Honorários contábeis", tipo: "ENTRADA", ativa: true },
  { id: "s1", nome: "Honorários contábeis", tipo: "SAIDA", ativa: true },
  { id: "o1", nome: "Aluguel", tipo: "ENTRADA", ativa: true },
];

describe("livroCaixaUtils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("expõe períodos e formas de pagamento", () => {
    expect(PERIODOS_RAPIDOS.some((p) => p.id === "ESTE_MES")).toBe(true);
    expect(FORMAS_PAGAMENTO).toContain("PIX");
    expect(NOME_CATEGORIA_HONORARIOS_CONTABEIS).toBe("Honorários contábeis");
  });

  it("reconhece categoria de honorários só por nome e tipo ENTRADA", () => {
    expect(isCategoriaHonorariosContabeis("", categorias)).toBe(false);
    expect(isCategoriaHonorariosContabeis("h1", categorias)).toBe(true);
    expect(isCategoriaHonorariosContabeis("s1", categorias)).toBe(false);
    expect(isCategoriaHonorariosContabeis("o1", categorias)).toBe(false);
    expect(isCategoriaHonorariosContabeis("inexistente", categorias)).toBe(false);
  });

  it("formata datas, meses e valores auxiliares", () => {
    expect(hojeIso()).toBe("2026-09-15");
    expect(formatarDataLivroCaixa("2026-09-15")).toMatch(/15/);
    expect(formatarMesLabel("")).toBe("—");
    expect(formatarMesLabel("09/2026")).toBe("09/2026");
    expect(formatarMesLabel("2026-09")).toBe("Set/26");
    expect(formatarMesLabel("2026")).toBe("2026");
    expect(formatarMesLabel("2026-99")).toBe("99/26");
  });

  it("rotula tipo, status, forma e origem", () => {
    expect(labelTipoMovimentacao("ENTRADA")).toBe("Entrada");
    expect(labelTipoMovimentacao("SAIDA")).toBe("Saída");
    expect(labelStatusMovimentacao("PREVISTO")).toBe("Previsto");
    expect(labelStatusMovimentacao("RECEBIDO")).toBe("Recebido");
    expect(labelStatusMovimentacao("PAGO")).toBe("Pago");
    expect(labelStatusMovimentacao("CANCELADO")).toBe("Cancelado");
    expect(labelStatusMovimentacao("OUTRO" as StatusMovimentacao)).toBe("OUTRO");
    expect(labelFormaPagamento()).toBe("—");
    expect(labelFormaPagamento("PIX")).toBe("PIX");
    expect(labelFormaPagamento("DINHEIRO")).toBe("Dinheiro");
    expect(labelFormaPagamento("BOLETO")).toBe("Boleto");
    expect(labelFormaPagamento("CARTAO_CREDITO")).toBe("Cartão crédito");
    expect(labelFormaPagamento("CARTAO_DEBITO")).toBe("Cartão débito");
    expect(labelFormaPagamento("TRANSFERENCIA")).toBe("Transferência");
    expect(labelFormaPagamento("DEBITO_AUTOMATICO")).toBe("Débito automático");
    expect(labelFormaPagamento("OUTRO")).toBe("Outro");
    expect(labelFormaPagamento("XYZ" as FormaPagamento)).toBe("XYZ");
    expect(labelOrigemMovimentacao()).toBe("—");
    expect(labelOrigemMovimentacao("MANUAL")).toBe("Manual");
    expect(labelOrigemMovimentacao("INADIMPLENCIA")).toBe("Inadimplência");
    expect(labelOrigemMovimentacao("RECORRENTE")).toBe("Recorrente");
    expect(labelOrigemMovimentacao("IMPORTACAO")).toBe("Importação");
    expect(labelOrigemMovimentacao("OUTRO")).toBe("Outro");
    expect(labelOrigemMovimentacao("XYZ" as OrigemMovimentacao)).toBe("Outro");
  });

  it("define classes visuais e status por tipo", () => {
    expect(classeBadgeStatus("RECEBIDO")).toContain("ok");
    expect(classeBadgeStatus("PAGO")).toContain("ok");
    expect(classeBadgeStatus("PREVISTO")).toContain("previsto");
    expect(classeBadgeStatus("CANCELADO")).toContain("cancelado");
    expect(classeBadgeStatus("X" as StatusMovimentacao)).toBe("livro-caixa__badge");
    expect(classeValorMovimentacao("ENTRADA")).toContain("entrada");
    expect(classeValorMovimentacao("SAIDA")).toContain("saida");
    expect(statusPermitidosPorTipo("ENTRADA")).toEqual(["PREVISTO", "RECEBIDO", "CANCELADO"]);
    expect(statusPermitidosPorTipo("SAIDA")).toEqual(["PREVISTO", "PAGO", "CANCELADO"]);
    expect(statusEfetivado("ENTRADA")).toBe("RECEBIDO");
    expect(statusEfetivado("SAIDA")).toBe("PAGO");
  });

  it("calcula períodos rápidos e filtros", () => {
    const hoje = hojeIso();
    expect(calcularPeriodoRapido("HOJE")).toEqual({ dataInicio: hoje, dataFim: hoje });
    const sete = calcularPeriodoRapido("7_DIAS");
    expect(sete.dataFim).toBe(hoje);
    expect(sete.dataInicio < sete.dataFim || sete.dataInicio === sete.dataFim).toBe(true);
    const esteMes = calcularPeriodoRapido("ESTE_MES");
    expect(esteMes.dataFim).toBe(hoje);
    expect(esteMes.dataInicio.endsWith("-01") || esteMes.dataInicio.length === 10).toBe(true);
    const mesPassado = calcularPeriodoRapido("MES_PASSADO");
    expect(mesPassado.dataInicio <= mesPassado.dataFim).toBe(true);
    expect(calcularPeriodoRapido("ULTIMOS_3_MESES").dataFim).toBe(hoje);
    expect(calcularPeriodoRapido("ESTE_ANO").dataFim).toBe(hoje);
    expect(calcularPeriodoRapido("PERSONALIZADO")).toEqual({ dataInicio: "", dataFim: "" });
    expect(paramsFiltroRapido("A_PAGAR")).toEqual({ tipo: "SAIDA", status: "PREVISTO" });
    expect(paramsFiltroRapido("A_RECEBER")).toEqual({ tipo: "ENTRADA", status: "PREVISTO" });
    expect(paramsFiltroRapido("")).toEqual({});
  });

  it("formata tamanho de arquivo", () => {
    expect(formatarTamanhoArquivo()).toBe("—");
    expect(formatarTamanhoArquivo(0)).toBe("—");
    expect(formatarTamanhoArquivo(512)).toBe("512 B");
    expect(formatarTamanhoArquivo(1536)).toContain("KB");
    expect(formatarTamanhoArquivo(2 * 1024 * 1024)).toContain("MB");
  });
});
