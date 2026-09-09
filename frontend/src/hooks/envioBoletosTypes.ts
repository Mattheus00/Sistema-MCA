import type { Dispatch, SetStateAction } from "react";
import { STATUS_ITEM_ENVIO, statusEh } from "@/lib/constants/status";
import {
  envioBoletoIdItem,
  itensElegiveisEnvio,
  resumoCardsFromLote,
} from "@/lib/envioBoletosUtils";
import type { Cliente, ItemEnvioBoleto } from "@/types/api";

export type AbaPrincipal = "novo" | "historico";
export type EtapaNovo = "upload" | "conferencia" | "resultado";
export type CardsResumoEnvio = ReturnType<typeof resumoCardsFromLote>;

export type EnvioBoletosFeedback = {
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  erro: string | null;
  setErro: Dispatch<SetStateAction<string | null>>;
  mensagemSucesso: string | null;
  setMensagemSucesso: Dispatch<SetStateAction<string | null>>;
};

export function montarResumoConfirmacao(itens: ItemEnvioBoleto[], selecionados: Set<string>) {
  const selecionadosLista = itens.filter((item) => selecionados.has(envioBoletoIdItem(item)));
  const prontos = itensElegiveisEnvio(itens, selecionados);
  const duplicados = selecionadosLista.filter((item) =>
    statusEh(item.status, STATUS_ITEM_ENVIO.DUPLICADO),
  ).length;
  return {
    selecionados: selecionadosLista.length,
    prontos: prontos.length,
    duplicados,
  };
}

export function filtrarClientesBusca(clientes: Cliente[], buscaCliente: string): Cliente[] {
  const t = buscaCliente.trim().toLowerCase();
  if (!t) return clientes;
  return clientes.filter((c) => {
    const nome = c.nome.toLowerCase();
    const codigo = (c.codigo ?? "").toLowerCase();
    const doc = (c.cpf ?? "").replace(/\D/g, "");
    const buscaDoc = t.replace(/\D/g, "");
    return nome.includes(t) || codigo.includes(t) || (buscaDoc && doc.includes(buscaDoc));
  });
}
