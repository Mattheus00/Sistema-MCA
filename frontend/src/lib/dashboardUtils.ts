import type { AgingRelatorio, Inadimplencia } from "@/types/api";
import { isInadimplenciaEmAberto, saldoDevedorItem } from "@/lib/inadimplentesUtils";

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PERCENT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatarMoedaDashboard(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(valor)) return "—";
  return MOEDA.format(valor);
}

export function formatarPercentualDashboard(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(valor)) return "—";
  return `${PERCENT.format(valor)}%`;
}

export function formatarDataDashboard(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return DATA.format(d);
}

export function formatarDataHoraDashboard(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return DATA_HORA.format(d);
}

export function iniciaisNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export function labelPerfilUsuario(perfil: string | null): string {
  if (perfil === "PROPRIETARIA") return "Proprietária";
  if (perfil === "RESPONSAVEL_FINANCEIRO") return "Responsável financeiro";
  if (perfil === "FUNCIONARIO") return "Funcionário";
  return "Usuário";
}

export function isDividaEmAberto(status: string | undefined): boolean {
  const s = (status ?? "EmAberto").toUpperCase();
  return s === "EMABERTO" || s === "EM_ABERTO" || s === "PARCIAL" || s === "ACORDO";
}

export function contarClientesInadimplentes(itens: Inadimplencia[]): number {
  const ids = new Set<string>();
  for (const item of itens) {
    if (isDividaEmAberto(item.status)) ids.add(item.clienteId);
  }
  return ids.size;
}

export function somarBaixadoCancelado(itens: Inadimplencia[]): number {
  return itens
    .filter((i) => {
      const s = (i.status ?? "").toUpperCase();
      return s === "ACORDO";
    })
    .reduce((acc, i) => acc + (i.valor ?? 0), 0);
}

export type PontoEvolucao = { mes: string; mesLabel: string; valor: number };

function extrairMesReferencia(iso: string): string | null {
  const texto = iso.trim();
  if (/^\d{4}-\d{2}/.test(texto)) return texto.slice(0, 7);
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}`;
  const d = new Date(texto);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return null;
}

/** Mês em que a dívida entrou na carteira (criação ou vencimento como fallback). */
function mesEntradaItem(item: Inadimplencia): string | null {
  const referencia = item.createdAt ?? item.vencimento;
  if (!referencia) return null;
  return extrairMesReferencia(referencia);
}

function somarValorAbertoItem(item: Inadimplencia): number {
  return saldoDevedorItem(item);
}

function labelMes(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  const ref = new Date(ano, mes - 1, 1);
  return ref.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function mesAtualChave(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function incrementosPorMesEntrada(itens: Inadimplencia[]): Map<string, number> {
  const incrementos = new Map<string, number>();
  for (const item of itens) {
    const chave = mesEntradaItem(item);
    if (!chave) continue;
    incrementos.set(chave, (incrementos.get(chave) ?? 0) + somarValorAbertoItem(item));
  }
  return incrementos;
}

function valorAcumuladoAteMes(incrementos: Map<string, number>, ateMes: string): number {
  let total = 0;
  for (const [mes, valor] of incrementos) {
    if (mes <= ateMes) total += valor;
  }
  return total;
}

function pontosCumulativos(incrementos: Map<string, number>, mesesExibicao: string[]): PontoEvolucao[] {
  return mesesExibicao.map((chave) => ({
    mes: chave,
    mesLabel: labelMes(chave),
    valor: valorAcumuladoAteMes(incrementos, chave),
  }));
}

function mesesJanelaRolante(quantidade: number, referencia = new Date()): string[] {
  const pontos: string[] = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    const ref = new Date(referencia.getFullYear(), referencia.getMonth() - i, 1);
    pontos.push(`${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`);
  }
  return pontos;
}

export function calcularEvolucaoValorAberto(
  itens: Inadimplencia[],
  meses: 6 | 12 | "total"
): PontoEvolucao[] {
  const emAberto = itens.filter((item) => isInadimplenciaEmAberto(item));
  const incrementos = incrementosPorMesEntrada(emAberto);
  if (incrementos.size === 0) return [];

  if (meses === "total") {
    const chaves = [...incrementos.keys()].sort();
    const ultima = chaves[chaves.length - 1];
    const ateMes = ultima > mesAtualChave() ? ultima : mesAtualChave();
    if (!chaves.includes(ateMes) && ateMes > ultima) chaves.push(ateMes);

    let acumulado = 0;
    return chaves.map((chave) => {
      acumulado += incrementos.get(chave) ?? 0;
      return { mes: chave, mesLabel: labelMes(chave), valor: acumulado };
    });
  }

  return pontosCumulativos(incrementos, mesesJanelaRolante(meses));
}

export type FaixaInadimplenciaUi = {
  id: string;
  rotulo: string;
  valor: number;
  percentual: number;
  cor: "verde" | "amarelo" | "laranja" | "vermelho";
};

export function mapAgingParaFaixas(aging: AgingRelatorio | null): FaixaInadimplenciaUi[] {
  if (!aging?.faixas?.length) return [];
  const mapaCor = (faixa: string): FaixaInadimplenciaUi["cor"] => {
    const f = faixa.toLowerCase();
    if (f.includes("0-30") || f.includes("até 30") || f.includes("ate 30")) return "verde";
    if (f.includes("31-60") || f.includes("31 a 60")) return "amarelo";
    if (f.includes("61-90") || f.includes("61 a 90")) return "laranja";
    return "vermelho";
  };
  return aging.faixas.map((f) => ({
    id: f.faixa,
    rotulo: f.faixa,
    valor: f.valorTotal,
    percentual: f.percentual,
    cor: mapaCor(f.faixa),
  }));
}

export type AtividadeDashboard = {
  id: string;
  titulo: string;
  descricao: string;
  usuario?: string;
  dataHora?: string;
  status?: string;
  valor?: number;
};

export function mapInadimplenciasParaAtividades(itens: Inadimplencia[]): AtividadeDashboard[] {
  return [...itens]
    .sort((a, b) => {
      const da = a.updatedAt ?? a.createdAt ?? a.vencimento ?? "";
      const db = b.updatedAt ?? b.createdAt ?? b.vencimento ?? "";
      return db.localeCompare(da);
    })
    .slice(0, 10)
    .map((item) => {
      const pago = (item.status ?? "").toUpperCase() === "PAGO";
      return {
        id: item.id ?? `${item.clienteId}-${item.vencimento}`,
        titulo: pago ? "Pagamento registrado" : "Inadimplência em aberto",
        descricao: `${item.clienteNome ?? `Cliente #${item.clienteId}`} · Venc. ${formatarDataDashboard(item.vencimento)}`,
        dataHora: item.updatedAt ?? item.createdAt,
        status: pago ? "Confirmado" : "Em aberto",
        valor: item.valor,
      };
    });
}

export function primeiroDiaMes(date = new Date()): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

export function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}
