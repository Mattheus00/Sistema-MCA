import type { Cliente, Inadimplencia } from "@/types/api";
import { diasEmAtraso, isInadimplenciaEmAberto, saldoDevedorItem } from "@/lib/inadimplentesUtils";
import { parseValorReais } from "@/lib/valorBrasil";

export type ClienteHonorarios = Pick<
  Cliente,
  "id" | "nome" | "cpf" | "email" | "celular" | "telefone"
>;

export type ModalPagamentoState = {
  tipo: "total" | "parcial";
  inadimplencia: Inadimplencia;
  nomeCliente: string;
  descontoDigitado: string;
  valorParcialDigitado: string;
  metodoPagamento: string;
  observacao: string;
  dataPagamento: string;
};

export type InadimplenciaParaCancelar = {
  item: Inadimplencia;
  nomeCliente: string;
};

export type ModalCobrancaCanalState = {
  inadimplencia: Inadimplencia;
};

export const ITENS_POR_PAGINA_HONORARIOS = 12;

export function descontoNormalizado(valorDigitado: string, saldo: number): number {
  const descontoLido = parseValorReais(valorDigitado);
  if (!Number.isFinite(descontoLido) || descontoLido <= 0) return 0;
  if (descontoLido >= saldo) return saldo;
  return descontoLido;
}

export function emailClienteValidoDe(cliente: ClienteHonorarios | null): string {
  return (cliente?.email ?? "").trim();
}

export function resumoHonorarios(itens: Inadimplencia[]) {
  const emAberto = itens.filter(isInadimplenciaEmAberto);
  const totalEmAberto = emAberto.reduce((s, i) => s + saldoDevedorItem(i), 0);
  const qtdEmAberto = emAberto.length;
  const maiorAtraso = emAberto.reduce((max, i) => Math.max(max, diasEmAtraso(i.vencimento)), 0);
  return { emAberto, totalEmAberto, qtdEmAberto, maiorAtraso };
}
