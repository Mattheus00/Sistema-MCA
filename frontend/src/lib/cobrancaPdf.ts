import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { Inadimplencia } from "@/types/api";
import { buildAvisoPendenciaHtml, fetchPixQrCodeDataUrl } from "@/lib/avisoPendenciaHtml";

function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  ).then(() => undefined);
}

function slugNome(nomeCliente: string): string {
  return nomeCliente
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

function nomeArquivoPdf(itens: Inadimplencia[], nomeCliente: string): string {
  const nome = slugNome(nomeCliente) || "cliente";
  const qtd = itens.length;
  const data = new Date().toISOString().slice(0, 10);
  return qtd === 1
    ? `aviso-pendencia-${nome}-${data}.pdf`
    : `aviso-pendencia-consolidado-${nome}-${qtd}periodos-${data}.pdf`;
}

type CssBlock = { top: number; bottom: number };

/** Posição Y do elemento relativa ao ancestral (CSS px). */
function offsetY(el: HTMLElement, ancestor: HTMLElement): number {
  const a = ancestor.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  return e.top - a.top;
}

/**
 * Coleta blocos marcados com [data-pdf-block] para evitar corte no meio
 * de seções (Pix, cards, linhas da tabela, rodapé etc.).
 */
function collectPdfBlocks(documento: HTMLElement): CssBlock[] {
  const nodes = Array.from(documento.querySelectorAll<HTMLElement>("[data-pdf-block]"));
  return nodes
    .map((el) => {
      const top = offsetY(el, documento);
      const bottom = top + el.offsetHeight;
      return { top, bottom };
    })
    .filter((b) => b.bottom > b.top)
    .sort((a, b) => a.top - b.top || a.bottom - b.bottom);
}

/**
 * Decide onde fatiar o documento em páginas A4.
 * Preenche a página o máximo possível; só quebra antes de um bloco se
 * o espaço restante for pequeno (evita “buraco” enorme no fim da página).
 */
function computePageSlices(
  totalHeight: number,
  pageHeight: number,
  blocks: CssBlock[]
): Array<{ y0: number; y1: number }> {
  const slices: Array<{ y0: number; y1: number }> = [];
  let y = 0;
  const eps = 0.5;
  /** Se sobrar mais que isso ao adiar um bloco, prefere cortar na altura da página. */
  const maxEmptyRatio = 0.2;

  while (y < totalHeight - eps) {
    const hardEnd = Math.min(y + pageHeight, totalHeight);
    let breakAt = hardEnd;

    const wouldCut = blocks.find(
      (b) => b.top >= y - eps && b.top < hardEnd - 8 && b.bottom > hardEnd + eps
    );

    if (wouldCut && wouldCut.top > y + 8) {
      const filled = wouldCut.top - y;
      const emptyRatio = 1 - filled / pageHeight;
      const bottomsBefore = blocks
        .filter((b) => b.bottom > y + eps && b.bottom <= wouldCut.top + eps)
        .map((b) => b.bottom);
      const safeBreak = bottomsBefore.length > 0 ? Math.max(...bottomsBefore) : wouldCut.top;

      if (emptyRatio <= maxEmptyRatio) {
        // Pouco espaço sobrando: empurra o bloco grande para a próxima página
        breakAt = safeBreak;
      } else {
        // Muito espaço sobrando: preenche a página (corta na altura A4)
        // em vez de deixar um buraco branco enorme.
        breakAt = hardEnd;
      }
    } else if (hardEnd < totalHeight - eps) {
      const nearBottoms = blocks
        .filter((b) => b.bottom > y + pageHeight * 0.55 && b.bottom <= hardEnd + eps)
        .map((b) => b.bottom);
      if (nearBottoms.length > 0) {
        breakAt = Math.max(...nearBottoms);
      }
    }

    if (breakAt <= y + eps) {
      breakAt = hardEnd;
    }

    if (totalHeight - breakAt < 12 && breakAt < totalHeight) {
      breakAt = totalHeight;
    }

    slices.push({ y0: y, y1: breakAt });
    y = breakAt;
  }

  return slices;
}

/** Escala mínima aceitável para forçar 1 página (legibilidade). */
const MIN_SINGLE_PAGE_SCALE = 0.72;

/**
 * Renderiza HTML offscreen → canvas → PDF A4.
 * Prefere 1 página (escalando um pouco); se precisar de várias, evita buracos grandes.
 */
async function renderHtmlToPdf(html: string, filename: string): Promise<void> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;pointer-events:none;overflow:visible;";
  host.innerHTML = html;
  document.body.appendChild(host);

  const documento = host.querySelector(".documento") as HTMLElement | null;
  if (!documento) {
    document.body.removeChild(host);
    throw new Error("Falha ao montar o documento do aviso de pendência.");
  }

  documento.style.minHeight = "auto";
  documento.style.width = "794px";

  try {
    await waitForImages(documento);
    await new Promise((r) => setTimeout(r, 100));

    const cssHeight = Math.ceil(documento.scrollHeight);
    const blocks = collectPdfBlocks(documento);

    const canvas = await html2canvas(documento, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: documento.scrollWidth,
      height: cssHeight,
      windowWidth: documento.scrollWidth,
      windowHeight: cssHeight,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidthMm = pageWidth;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
    const fitRatio = pageHeight / imgHeightMm;

    // Cabe em 1 página nativamente, ou com leve redução (evita 2ª página quase vazia)
    if (imgHeightMm <= pageHeight + 0.5 || fitRatio >= MIN_SINGLE_PAGE_SCALE) {
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      const x = (pageWidth - w) / 2;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, 0, w, h, undefined, "FAST");
      pdf.save(filename);
      return;
    }

    const scale = canvas.height / cssHeight;
    const pageHeightCss = pageHeight / (pageWidth / (documento.scrollWidth || 794));
    const slices = computePageSlices(cssHeight, pageHeightCss, blocks);

    slices.forEach((slice, pageIndex) => {
      const srcY = Math.round(slice.y0 * scale);
      const srcYEnd = Math.min(canvas.height, Math.round(slice.y1 * scale));
      const sliceHeight = Math.max(1, srcYEnd - srcY);

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeight;
      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível criar o canvas do PDF.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        srcY,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      if (pageIndex > 0) pdf.addPage();
      const sliceHeightMm = (sliceHeight * pageWidth) / canvas.width;
      pdf.addImage(
        sliceCanvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pageWidth,
        sliceHeightMm,
        undefined,
        "FAST"
      );
    });

    pdf.save(filename);
  } finally {
    document.body.removeChild(host);
  }
}

/**
 * Gera e baixa o PDF do aviso de pendência (1 ou mais períodos).
 */
export async function gerarEBaixarAvisoPendenciaPdf(
  itensOuItem: Inadimplencia | Inadimplencia[],
  nomeCliente: string
): Promise<void> {
  const itens = Array.isArray(itensOuItem) ? itensOuItem : [itensOuItem];
  if (itens.length === 0) {
    throw new Error("Nenhuma cobrança para incluir no PDF.");
  }
  const qrCodeSrc = await fetchPixQrCodeDataUrl(180);
  const html = buildAvisoPendenciaHtml({ itens, nomeCliente, qrCodeSrc });
  await renderHtmlToPdf(html, nomeArquivoPdf(itens, nomeCliente));
}
