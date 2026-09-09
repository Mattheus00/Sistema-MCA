import AdminItemCard from "@/components/ui/AdminItemCard";
import ResumoCard from "@/components/envio-boletos/ResumoCard";
import { AlertIcon, EyeOffIcon, SendIcon } from "@/components/envio-boletos/EnvioBoletosIcons";
import ResponsiveList from "@/components/ui/ResponsiveList";
import { getApiErrorMessage } from "@/lib/api";
import { baixarRelatorioCsv } from "@/lib/envioBoletosApi";
import {
  envioBoletoIdItem,
  exibirDocumento,
  indicadorStatusItem,
  labelStatusItem,
} from "@/lib/envioBoletosUtils";
import type { CardsResumoEnvio } from "@/hooks/envioBoletosTypes";
import type { ItemEnvioBoleto, LoteEnvioBoleto } from "@/types/api";

type ResultadoStepProps = {
  lote: LoteEnvioBoleto;
  itens: ItemEnvioBoleto[];
  cards: CardsResumoEnvio;
  itensErro: ItemEnvioBoleto[];
  loading: boolean;
  limparNovoEnvio: () => void;
  executarEnvio: (itemIds?: string[]) => void;
  setErro: (mensagem: string | null) => void;
};

export default function ResultadoStep({
  lote,
  itens,
  cards,
  itensErro,
  loading,
  limparNovoEnvio,
  executarEnvio,
  setErro,
}: ResultadoStepProps) {
  return (
    <section className="page-envio-boletos__resultado">
      <div className="page-envio-boletos__stats page-envio-boletos__stats--compacto">
        <ResumoCard
          label="Enviados"
          valor={cards.enviados}
          tipo="verde"
          tooltip="Boletos enviados com sucesso."
          icon={<SendIcon />}
        />
        <ResumoCard
          label="Erros"
          valor={cards.erros}
          tipo="laranja"
          tooltip="Itens com falha no envio."
          icon={<AlertIcon />}
        />
        <ResumoCard
          label="Ignorados"
          valor={cards.ignorados}
          tipo="cinza"
          tooltip="Itens ignorados no lote."
          icon={<EyeOffIcon />}
        />
      </div>

      <ResponsiveList
        desktop={
          <div className="page-envio-boletos__tabela-wrap">
            <table className="page-envio-boletos__tabela">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>E-mail</th>
                  <th>Arquivo</th>
                  <th>Status</th>
                  <th>Erro</th>
                  <th>Simulado</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.itemId}>
                    <td>{item.clienteNome?.trim() || "—"}</td>
                    <td>{exibirDocumento(item.emailDestinatario)}</td>
                    <td>{item.nomeArquivoOriginal}</td>
                    <td>
                      <span
                        className={`page-envio-boletos__badge page-envio-boletos__badge--${indicadorStatusItem(item).cor}`}
                      >
                        {labelStatusItem(item.status)}
                      </span>
                    </td>
                    <td>{item.erro?.trim() || "—"}</td>
                    <td>{item.simulado ? "Sim" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
        mobile={
          <ul className="admin-item-list">
            {itens.map((item) => (
              <li key={item.itemId}>
                <AdminItemCard
                  title={item.clienteNome?.trim() || "—"}
                  meta={item.nomeArquivoOriginal}
                  fields={[
                    { label: "E-mail", value: exibirDocumento(item.emailDestinatario) },
                    {
                      label: "Status",
                      value: (
                        <span
                          className={`page-envio-boletos__badge page-envio-boletos__badge--${indicadorStatusItem(item).cor}`}
                        >
                          {labelStatusItem(item.status)}
                        </span>
                      ),
                    },
                    { label: "Erro", value: item.erro?.trim() || "—" },
                    { label: "Simulado", value: item.simulado ? "Sim" : "Não" },
                  ]}
                />
              </li>
            ))}
          </ul>
        }
      />

      <div className="page-envio-boletos__acoes-principais">
        <button
          type="button"
          className="btn btn--secondary"
          disabled={loading}
          onClick={limparNovoEnvio}
        >
          Iniciar novo envio
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={loading}
          onClick={async () => {
            try {
              await baixarRelatorioCsv(lote.loteId);
            } catch (e: unknown) {
              setErro(getApiErrorMessage(e, "Falha ao baixar o relatório."));
            }
          }}
        >
          Baixar CSV
        </button>
        {itensErro.length > 0 && (
          <button
            type="button"
            className="btn btn--primary"
            disabled={loading}
            onClick={() => executarEnvio(itensErro.map((i) => envioBoletoIdItem(i)))}
          >
            Reenviar itens com erro ({itensErro.length})
          </button>
        )}
      </div>
    </section>
  );
}
