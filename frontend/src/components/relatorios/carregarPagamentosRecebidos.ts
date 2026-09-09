import { decodeConfirmadoPorComprovante } from "@/lib/apiNormalizers";
import { listarInadimplentes, listarPagamentosDivida } from "@/lib/inadimplentesApi";
import { obterPagamentosRecebidos, obterResumoFinanceiro } from "@/lib/relatoriosApi";
import type { PagamentosRecebidosRelatorio } from "@/types/api";

export async function carregarPagamentosRecebidos(
  dataInicioPag: string,
  dataFimPag: string,
): Promise<PagamentosRecebidosRelatorio> {
  try {
    const normalizado = await obterPagamentosRecebidos(dataInicioPag, dataFimPag);
    if (normalizado) {
      return normalizado;
    }
  } catch {
    // Endpoint opcional: tenta montar o detalhamento pelas dívidas pagas.
  }

  const [resumoRes, inadRes] = await Promise.allSettled([
    obterResumoFinanceiro(dataInicioPag, dataFimPag),
    listarInadimplentes(),
  ]);

  const resumo = resumoRes.status === "fulfilled" ? resumoRes.value : null;

  const detalhamento: PagamentosRecebidosRelatorio["detalhamento"] = [];
  if (inadRes.status === "fulfilled") {
    const lista = inadRes.value;
    const inicio = new Date(dataInicioPag);
    const fim = new Date(dataFimPag);
    const naFaixa = (iso: string) => {
      const dtStr = iso.split("T")[0];
      if (!dtStr) return false;
      const dt = new Date(dtStr);
      return dt >= inicio && dt <= fim;
    };

    for (const i of lista) {
      const pagamentosItem = i.pagamentos ?? [];
      if (pagamentosItem.length > 0) {
        for (const p of pagamentosItem) {
          const dataPag = (p.dataPagamento ?? "").split("T")[0];
          if (!dataPag || !naFaixa(dataPag)) continue;
          detalhamento.push({
            data: dataPag,
            clienteNome: i.clienteNome ?? `Cliente #${i.clienteId ?? "—"}`,
            protocolo: String(p.pagamentoId ?? i.id ?? ""),
            valor: Number(p.valorPago ?? 0),
            metodo: p.metodoPagamento ?? "—",
            saldoRestante: 0,
            vencimento: i.vencimento,
            confirmadoPor:
              p.confirmadoPor?.trim() || decodeConfirmadoPorComprovante(p.comprovante) || undefined,
          });
        }
        continue;
      }

      if (
        !String(i.status ?? "")
          .toLowerCase()
          .includes("pago")
      )
        continue;
      const dataPag = (i.updatedAt ?? i.createdAt ?? i.vencimento ?? "").split("T")[0];
      if (!dataPag || !naFaixa(dataPag)) continue;

      // Dívida quitada sem array embutido: busca pagamentos da dívida
      let confirmadoPor: string | undefined;
      let metodo = "—";
      let valor = Number(i.valor ?? 0);
      try {
        const pags = await listarPagamentosDivida(String(i.id));
        const ultimo = pags.sort((a, b) =>
          String(b.dataPagamento).localeCompare(String(a.dataPagamento)),
        )[0];
        if (ultimo) {
          confirmadoPor =
            ultimo.confirmadoPor?.trim() ||
            decodeConfirmadoPorComprovante(ultimo.comprovante) ||
            undefined;
          metodo = ultimo.metodoPagamento ?? metodo;
          if (ultimo.valorPago > 0) valor = ultimo.valorPago;
        }
      } catch {
        // sem endpoint de pagamentos por dívida
      }

      detalhamento.push({
        data: dataPag,
        clienteNome: i.clienteNome ?? `Cliente #${i.clienteId ?? "—"}`,
        protocolo: String(i.id ?? ""),
        valor,
        metodo,
        saldoRestante: 0,
        vencimento: i.vencimento,
        confirmadoPor,
      });
    }
  }

  const valorTotal = resumo?.totalRecebido ?? detalhamento.reduce((s, p) => s + p.valor, 0);

  return {
    dataInicio: resumo?.periodoInicio ?? dataInicioPag,
    dataFim: resumo?.periodoFim ?? dataFimPag,
    totalPagamentos: detalhamento.length,
    valorTotal,
    porMetodo: [],
    detalhamento,
  };
}
