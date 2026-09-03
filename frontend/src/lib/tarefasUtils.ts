import type { ModoVisualizacaoTarefas, PrioridadeTarefa, StatusTarefa } from "@/types/tarefas";
import { iniciaisNome } from "@/lib/dashboardUtils";

export const STATUS_KANBAN: StatusTarefa[] = ["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "CONCLUIDO"];

export const MODO_TAREFAS_STORAGE_KEY = "sgi_tarefas_modo_visualizacao";

export function labelStatusTarefa(status: StatusTarefa): string {
  switch (status) {
    case "BACKLOG":
      return "Backlog";
    case "A_FAZER":
      return "A Fazer";
    case "EM_ANDAMENTO":
      return "Em andamento";
    case "EM_REVISAO":
      return "Em revisão";
    case "CONCLUIDO":
      return "Concluído";
    default:
      return status;
  }
}

export function labelPrioridadeTarefa(prioridade: PrioridadeTarefa): string {
  switch (prioridade) {
    case "BAIXA":
      return "Baixa";
    case "MEDIA":
      return "Média";
    case "ALTA":
      return "Alta";
    default:
      return prioridade;
  }
}

export function classeStatusTarefa(status: StatusTarefa): string {
  switch (status) {
    case "BACKLOG":
      return "tarefas__badge-status tarefas__badge-status--backlog";
    case "A_FAZER":
      return "tarefas__badge-status tarefas__badge-status--fazer";
    case "EM_ANDAMENTO":
      return "tarefas__badge-status tarefas__badge-status--andamento";
    case "EM_REVISAO":
      return "tarefas__badge-status tarefas__badge-status--revisao";
    case "CONCLUIDO":
      return "tarefas__badge-status tarefas__badge-status--concluido";
    default:
      return "tarefas__badge-status";
  }
}

export function classePrioridadeTarefa(prioridade: PrioridadeTarefa): string {
  switch (prioridade) {
    case "BAIXA":
      return "tarefas__badge-prioridade tarefas__badge-prioridade--baixa";
    case "MEDIA":
      return "tarefas__badge-prioridade tarefas__badge-prioridade--media";
    case "ALTA":
      return "tarefas__badge-prioridade tarefas__badge-prioridade--alta";
    default:
      return "tarefas__badge-prioridade";
  }
}

export function corPrioridadeCalendario(prioridade: PrioridadeTarefa): string {
  switch (prioridade) {
    case "ALTA":
      return "#dc2626";
    case "MEDIA":
      return "#ea580c";
    case "BAIXA":
      return "#2563eb";
    default:
      return "#64748b";
  }
}

export function formatarDataTarefa(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function truncarTexto(texto: string | undefined, max = 90): string {
  if (!texto) return "";
  const t = texto.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function progressoChecklist(concluidos: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((concluidos / total) * 100);
}

export function iniciaisResponsavel(nome?: string): string {
  return iniciaisNome(nome || "?") || "?";
}

export function lerModoVisualizacaoSalvo(): ModoVisualizacaoTarefas {
  try {
    const raw = localStorage.getItem(MODO_TAREFAS_STORAGE_KEY);
    if (raw === "kanban" || raw === "lista" || raw === "calendario") return raw;
  } catch {
    /* ignore */
  }
  return "kanban";
}

export function salvarModoVisualizacao(modo: ModoVisualizacaoTarefas): void {
  try {
    localStorage.setItem(MODO_TAREFAS_STORAGE_KEY, modo);
  } catch {
    /* ignore */
  }
}

export function primeiroDiaMes(ano: number, mes: number): Date {
  return new Date(ano, mes, 1);
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

export function labelMesAno(ano: number, mes: number): string {
  return new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function isoDataLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
