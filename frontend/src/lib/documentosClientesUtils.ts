import type { StatusDocumentoCliente, TipoDocumentoCliente } from "@/types/api";
import { formatarData } from "@/lib/valorBrasil";
import { STATUS_DOCUMENTO } from "@/lib/constants/status";

export function labelStatusDocumentoCliente(status: StatusDocumentoCliente | string): string {
  const map: Record<string, string> = {
    [STATUS_DOCUMENTO.ENVIADO]: "Novo",
    [STATUS_DOCUMENTO.RECEBIDO]: "Recebido",
    [STATUS_DOCUMENTO.EM_ANALISE]: "Em análise",
    [STATUS_DOCUMENTO.ARQUIVADO]: "Arquivado",
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
  return formatarData(iso);
}
