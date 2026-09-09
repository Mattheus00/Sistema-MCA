import { createPortal } from "react-dom";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { getApiErrorMessage } from "@/lib/api";
import { baixarRelatorioCsv } from "@/lib/envioBoletosApi";
import { exibirDocumento, labelStatusItem } from "@/lib/envioBoletosUtils";
import { formatarDataHora } from "@/lib/valorBrasil";
import type { ResultadoEnvioItem, ResultadoEnvioLote } from "@/types/api";

type ResultadoEnvioModalProps = {
  resultadoHistorico: ResultadoEnvioLote;
  setResultadoHistorico: (resultado: ResultadoEnvioLote | null) => void;
  setErro: (mensagem: string | null) => void;
};

function SecaoResultadoHistorico({
  titulo,
  variante,
  itens,
  colunas,
}: {
  titulo: string;
  variante: "verde" | "vermelho" | "cinza";
  itens: ResultadoEnvioItem[];
  colunas: Array<"cliente" | "email" | "arquivo" | "data" | "erro" | "status">;
}) {
  return (
    <section
      className={`page-envio-boletos__secao-resultado page-envio-boletos__secao-resultado--${variante}`}
    >
      <h3 className="page-envio-boletos__secao-titulo">
        {titulo} <span className="page-envio-boletos__secao-contagem">({itens.length})</span>
      </h3>
      {itens.length === 0 ? (
        <p className="page-envio-boletos__secao-vazio">Nenhum item.</p>
      ) : (
        <div className="page-envio-boletos__tabela-wrap">
          <table className="page-envio-boletos__tabela page-envio-boletos__tabela--secao">
            <thead>
              <tr>
                {colunas.includes("cliente") && <th>Cliente</th>}
                {colunas.includes("email") && <th>E-mail</th>}
                {colunas.includes("arquivo") && <th>Arquivo</th>}
                {colunas.includes("data") && <th>Data envio</th>}
                {colunas.includes("erro") && <th>Erro</th>}
                {colunas.includes("status") && <th>Status</th>}
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.envioBoletoId}>
                  {colunas.includes("cliente") && <td>{item.clienteNome?.trim() || "—"}</td>}
                  {colunas.includes("email") && <td>{exibirDocumento(item.emailDestinatario)}</td>}
                  {colunas.includes("arquivo") && <td>{item.nomeArquivoOriginal ?? "—"}</td>}
                  {colunas.includes("data") && <td>{formatarDataHora(item.dataEnvio)}</td>}
                  {colunas.includes("erro") && <td>{item.mensagemErro?.trim() || "—"}</td>}
                  {colunas.includes("status") && <td>{labelStatusItem(item.status)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function ResultadoEnvioModal({
  resultadoHistorico,
  setResultadoHistorico,
  setErro,
}: ResultadoEnvioModalProps) {
  useBodyScrollLock(true);

  return createPortal(
    <ModalOverlay onDismiss={() => setResultadoHistorico(null)}>
      <div
        className="modal modal--largo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-historico-titulo"
      >
        <h2 id="modal-historico-titulo" className="modal__titulo">
          Detalhe do lote
        </h2>
        <p className="page-envio-boletos__modal-resumo">
          {formatarDataHora(resultadoHistorico.criadoEm)}
          {resultadoHistorico.dataFinalizacao
            ? ` · Finalizado em ${formatarDataHora(resultadoHistorico.dataFinalizacao)}`
            : ""}
          {resultadoHistorico.status ? ` · ${resultadoHistorico.status}` : ""}
        </p>

        <SecaoResultadoHistorico
          titulo="Enviados"
          variante="verde"
          itens={resultadoHistorico.enviados}
          colunas={["cliente", "email", "arquivo", "data"]}
        />
        <SecaoResultadoHistorico
          titulo="Com erro"
          variante="vermelho"
          itens={resultadoHistorico.comErro}
          colunas={["cliente", "email", "arquivo", "erro"]}
        />
        <SecaoResultadoHistorico
          titulo="Não enviados"
          variante="cinza"
          itens={resultadoHistorico.naoEnviados}
          colunas={["cliente", "email", "arquivo", "status"]}
        />

        <div className="modal__acoes">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={async () => {
              try {
                await baixarRelatorioCsv(resultadoHistorico.loteId);
              } catch (e: unknown) {
                setErro(getApiErrorMessage(e, "Falha ao baixar o relatório."));
              }
            }}
          >
            Baixar CSV
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setResultadoHistorico(null)}
          >
            Fechar
          </button>
        </div>
      </div>
    </ModalOverlay>,
    document.body,
  );
}
