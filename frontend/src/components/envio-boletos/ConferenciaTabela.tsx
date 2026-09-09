import {
  AlertIcon,
  EyeOffIcon,
  FileIcon,
  MailIcon,
  RefreshIcon,
  SendIcon,
} from "@/components/envio-boletos/EnvioBoletosIcons";
import {
  ConferenciaCardMobile,
  ConferenciaLinhaTabela,
} from "@/components/envio-boletos/ConferenciaItem";
import ResumoCard from "@/components/envio-boletos/ResumoCard";
import ResponsiveList from "@/components/ui/ResponsiveList";
import {
  envioBoletoIdItem,
  loteTemItensProntos,
  todosItensSelecionaveis,
} from "@/lib/envioBoletosUtils";
import type { CardsResumoEnvio } from "@/hooks/envioBoletosTypes";
import type { ItemEnvioBoleto, LoteEnvioBoleto } from "@/types/api";

type ConferenciaTabelaProps = {
  lote: LoteEnvioBoleto;
  itens: ItemEnvioBoleto[];
  cards: CardsResumoEnvio;
  selecionados: Set<string>;
  loading: boolean;
  podeEnviar: boolean;
  toggleItem: (envioBoletoId: string) => void;
  toggleTodos: () => void;
  visualizarPdf: (itemId: string) => void;
  abrirModalCorrigir: (item: ItemEnvioBoleto) => void;
  patchItem: (itemId: string, acao: "confirmar" | "ignorar") => void;
  validarLoteAtual: () => void;
  onEnviar: () => void;
};

export default function ConferenciaTabela({
  lote,
  itens,
  cards,
  selecionados,
  loading,
  podeEnviar,
  toggleItem,
  toggleTodos,
  visualizarPdf,
  abrirModalCorrigir,
  patchItem,
  validarLoteAtual,
  onEnviar,
}: ConferenciaTabelaProps) {
  const itemProps = {
    lote,
    selecionados,
    toggleItem,
    visualizarPdf,
    abrirModalCorrigir,
    patchItem,
  };

  return (
    <section className="page-envio-boletos__conferencia">
      <div className="page-envio-boletos__conferencia-header">
        <h2 className="page-envio-boletos__conferencia-title">Conferência dos boletos</h2>
        <p className="page-envio-boletos__conferencia-subtitle">
          Revise os vínculos entre boletos, clientes e e-mails antes do envio.
        </p>
      </div>

      <div className="page-envio-boletos__stats">
        <ResumoCard
          label="Total de arquivos"
          valor={cards.total}
          tipo="roxo"
          tooltip="Quantidade total de PDFs enviados neste lote."
          icon={<FileIcon />}
        />
        <ResumoCard
          label="Prontos para envio"
          valor={cards.prontos}
          tipo="verde"
          tooltip="Itens identificados, com e-mail e aptos para disparo."
          icon={<SendIcon />}
        />
        <ResumoCard
          label="Sem e-mail"
          valor={cards.semEmail}
          tipo="amarelo"
          tooltip="Clientes identificados sem e-mail cadastrado."
          icon={<MailIcon />}
        />
        <ResumoCard
          label="Pendentes de correção"
          valor={cards.pendentesCorrecao}
          tipo="laranja"
          tooltip="Itens que precisam de revisão ou confirmação manual."
          icon={<AlertIcon />}
        />
        <ResumoCard
          label="Ignorados"
          valor={cards.ignorados}
          tipo="cinza"
          tooltip="Itens excluídos do envio deste lote."
          icon={<EyeOffIcon />}
        />
      </div>

      <ResponsiveList
        desktop={
          <div className="page-envio-boletos__tabela-wrap page-envio-boletos__tabela-wrap--conferencia">
            <table className="page-envio-boletos__tabela page-envio-boletos__tabela--conferencia">
              <thead>
                <tr>
                  <th className="page-envio-boletos__th-check">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos"
                      checked={
                        todosItensSelecionaveis(itens).length > 0 &&
                        todosItensSelecionaveis(itens).every((id) => selecionados.has(id))
                      }
                      onChange={toggleTodos}
                    />
                  </th>
                  <th>Arquivo</th>
                  <th>Cliente</th>
                  <th>CPF/CNPJ</th>
                  <th>E-mail</th>
                  <th>Método</th>
                  <th>Confiança</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="page-envio-boletos__vazio">
                      Nenhum item no lote.
                    </td>
                  </tr>
                ) : (
                  itens.map((item) => (
                    <ConferenciaLinhaTabela
                      key={envioBoletoIdItem(item)}
                      item={item}
                      {...itemProps}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        }
        mobile={
          itens.length === 0 ? (
            <p className="page-envio-boletos__vazio">Nenhum item no lote.</p>
          ) : (
            <ul className="admin-item-list">
              {itens.map((item) => (
                <ConferenciaCardMobile key={envioBoletoIdItem(item)} item={item} {...itemProps} />
              ))}
            </ul>
          )
        }
      />

      {lote.validacao && !lote.validacao.podeEnviar && lote.validacao.bloqueios.length > 0 && (
        <div className="page-envio-boletos__bloqueios" role="alert">
          <strong>Pendências antes do envio:</strong>
          <ul>
            {lote.validacao.bloqueios.map((b) => {
              const itemRef = itens.find((i) => envioBoletoIdItem(i) === b.itemId);
              const rotulo = itemRef?.nomeArquivoOriginal ?? b.itemId;
              return (
                <li key={`${b.itemId}-${b.motivo}`}>
                  <span className="page-envio-boletos__bloqueio-arquivo">{rotulo}</span>: {b.motivo}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="page-envio-boletos__acoes-principais page-envio-boletos__acoes-principais--conferencia">
        <button
          type="button"
          className="btn btn--secondary page-envio-boletos__btn-revalidar"
          disabled={loading}
          onClick={validarLoteAtual}
        >
          <RefreshIcon />
          {loading ? "Revalidando..." : "Revalidar"}
        </button>
        <button
          type="button"
          className="btn btn--primary page-envio-boletos__btn-enviar"
          disabled={loading || !podeEnviar || !loteTemItensProntos(itens)}
          onClick={onEnviar}
        >
          <SendIcon />
          {loading ? "Processando..." : "Enviar e-mails"}
        </button>
      </div>
    </section>
  );
}
