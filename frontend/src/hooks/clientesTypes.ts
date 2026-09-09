import { STATUS_CLIENTE } from "@/lib/constants/status";
import type { Cliente } from "@/types/api";

export type FiltroSituacaoCliente = typeof STATUS_CLIENTE.ATIVO | typeof STATUS_CLIENTE.INATIVO;

export type OrdenarClientesPor = "codigo" | "nome" | "cpf";

export const ITENS_POR_PAGINA_CLIENTES = 10;

export const FORM_VAZIO: Cliente = {
  codigo: "",
  nome: "",
  email: "",
  cpf: "",
  celular: "",
  endereco: "",
  situacao: "Ativo",
};

export function formatCpf(cpf: string | undefined): string {
  if (!cpf) return "—";
  const n = cpf.replace(/\D/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return cpf;
}

export function maskCpfCnpj(value: string): string {
  const n = value.replace(/\D/g, "").slice(0, 14);
  if (n.length <= 11) {
    return n
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return n
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

export function isValidEmail(email: string): boolean {
  if (!email?.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function compareCodigo(a: string | undefined, b: string | undefined, mul: number): number {
  const ca = (a ?? "").trim();
  const cb = (b ?? "").trim();
  const na = /^\d+$/.test(ca) ? Number(ca) : NaN;
  const nb = /^\d+$/.test(cb) ? Number(cb) : NaN;
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return mul * (na - nb);
  return mul * ca.localeCompare(cb, "pt-BR", { numeric: true });
}

/** Filtro local apenas para modo mock (API real já filtra com `busca`). */
export function filtrarClientesPorTermoMock(lista: Cliente[], termo?: string): Cliente[] {
  const t = termo?.trim();
  if (!t) return lista;
  const tl = t.toLowerCase();
  const td = t.replace(/\D/g, "");
  return lista.filter((c) => {
    const codigo = (c.codigo ?? "").trim().toLowerCase();
    const nome = c.nome.toLowerCase();
    const cpf = (c.cpf ?? "").toLowerCase();
    const cpfDigitos = (c.cpf ?? "").replace(/\D/g, "");
    return (
      codigo === tl ||
      codigo.includes(tl) ||
      nome.includes(tl) ||
      cpf.includes(tl) ||
      (td.length > 0 && cpfDigitos.includes(td))
    );
  });
}

export function formatCelular(tel: string | undefined): string {
  if (!tel) return "—";
  const n = tel.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : tel;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

export function maskCelular(value: string): string {
  const n = value.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}
