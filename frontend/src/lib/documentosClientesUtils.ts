import type { StatusDocumentoCliente, TipoDocumentoCliente } from "@/types/api";

export function labelStatusDocumentoCliente(status: StatusDocumentoCliente | string): string {
  const map: Record<string, string> = {
    ENVIADO: "Novo",
    RECEBIDO: "Recebido",
    EM_ANALISE: "Em análise",
    ARQUIVADO: "Arquivado",
  };
  return map[String(status).toUpperCase()] ?? String(status);
}

export function labelTipoDocumentoCliente(tipo: TipoDocumentoCliente | string): string {
  const map: Record<string, string> = {
    COMPROVANTE: "Comprovante",
    NOTA_FISCAL: "Nota fiscal",
    CONTRATO: "Contrato",
    DECLARACAO: "Declaração",
    OUTRO: "Outro",
  };
  return map[String(tipo).toUpperCase()] ?? String(tipo);
}

export function classeBadgeStatusDocumento(status: StatusDocumentoCliente | string): string {
  const s = String(status).toUpperCase();
  if (s === "ENVIADO") return "page-documentos-clientes__badge--novo";
  if (s === "EM_ANALISE") return "page-documentos-clientes__badge--analise";
  if (s === "ARQUIVADO") return "page-documentos-clientes__badge--arquivado";
  return "page-documentos-clientes__badge--recebido";
}

export function formatarTamanhoArquivo(bytes: number | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncarTexto(texto: string | undefined, max = 60): string {
  if (!texto?.trim()) return "—";
  const t = texto.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function formatarDataDocumento(iso: string | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
