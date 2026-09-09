import AdminItemCard from "@/components/ui/AdminItemCard";
import { BanIcon, EditIcon, EyeIcon, PdfIcon } from "@/components/envio-boletos/EnvioBoletosIcons";
import {
  envioBoletoIdItem,
  exibirDocumento,
  exibirEmailItem,
  indicadorStatusItem,
  itemBloqueiaEnvio,
  labelConfianca,
  labelMetodoIdentificacao,
  motivoBloqueioItem,
} from "@/lib/envioBoletosUtils";
import { STATUS_ITEM_ENVIO } from "@/lib/constants/status";
import type { ItemEnvioBoleto, LoteEnvioBoleto } from "@/types/api";

type ConferenciaItemProps = {
  item: ItemEnvioBoleto;
  lote: LoteEnvioBoleto;
  selecionados: Set<string>;
  toggleItem: (envioBoletoId: string) => void;
  visualizarPdf: (itemId: string) => void;
  abrirModalCorrigir: (item: ItemEnvioBoleto) => void;
  patchItem: (itemId: string, acao: "confirmar" | "ignorar") => void;
};

export function ConferenciaLinhaTabela({
  item,
  lote,
  selecionados,
  toggleItem,
  visualizarPdf,
  abrirModalCorrigir,
  patchItem,
}: ConferenciaItemProps) {
  const indicador = indicadorStatusItem(item);
  const status = String(item.status ?? "").toUpperCase();
  const emailInfo = exibirEmailItem(item);
  const bloqueio = motivoBloqueioItem(item, lote?.validacao);
  const itemId = envioBoletoIdItem(item);
  return (
    <tr className={itemBloqueiaEnvio(item) ? "page-envio-boletos__linha--bloqueada" : ""}>
      <td>
        <input
          type="checkbox"
          checked={selecionados.has(itemId)}
          disabled={status === STATUS_ITEM_ENVIO.IGNORADO}
          onChange={() => toggleItem(itemId)}
          aria-label={`Selecionar ${item.nomeArquivoOriginal}`}
        />
      </td>
      <td>
        <div className="page-envio-boletos__arquivo-cell">
          <span className="page-envio-boletos__pdf-icon" aria-hidden="true">
            <PdfIcon />
          </span>
          <span
            className="page-envio-boletos__arquivo-nome-tabela"
            title={item.nomeArquivoOriginal}
          >
            {item.nomeArquivoOriginal}
          </span>
        </div>
      </td>
      <td>{item.clienteNome?.trim() || "—"}</td>
      <td>{exibirDocumento(item.documentoMascarado)}</td>
      <td>
        <span className={emailInfo.ausente ? "page-envio-boletos__email-ausente" : ""}>
          {emailInfo.texto}
        </span>
      </td>
      <td>{labelMetodoIdentificacao(item.metodoIdentificacao)}</td>
      <td>{labelConfianca(item.confiancaIdentificacao)}</td>
      <td>
        <span className={`page-envio-boletos__badge page-envio-boletos__badge--${indicador.cor}`}>
          {indicador.texto}
        </span>
        {bloqueio && itemBloqueiaEnvio(item) && (
          <div className="page-envio-boletos__bloqueio-item" title={bloqueio}>
            {bloqueio}
          </div>
        )}
      </td>
      <td>
        <div className="page-envio-boletos__acoes-linha">
          <button
            type="button"
            className="page-envio-boletos__acao"
            title="Visualizar PDF"
            onClick={() => visualizarPdf(itemId)}
          >
            <EyeIcon />
            PDF
          </button>
          <button
            type="button"
            className="page-envio-boletos__acao"
            onClick={() => abrirModalCorrigir(item)}
          >
            <EditIcon />
            Corrigir
          </button>
          {status !== "IGNORADO" && (
            <button
              type="button"
              className="page-envio-boletos__acao"
              onClick={() => patchItem(itemId, "ignorar")}
            >
              <BanIcon />
              Ignorar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function ConferenciaCardMobile({
  item,
  lote,
  selecionados,
  toggleItem,
  visualizarPdf,
  abrirModalCorrigir,
  patchItem,
}: ConferenciaItemProps) {
  const indicador = indicadorStatusItem(item);
  const status = String(item.status ?? "").toUpperCase();
  const emailInfo = exibirEmailItem(item);
  const bloqueio = motivoBloqueioItem(item, lote?.validacao);
  const itemId = envioBoletoIdItem(item);
  return (
    <li>
      <AdminItemCard
        title={item.nomeArquivoOriginal}
        meta={item.clienteNome?.trim() || "—"}
        fields={[
          {
            label: "Selecionar",
            value: (
              <input
                type="checkbox"
                checked={selecionados.has(itemId)}
                disabled={status === STATUS_ITEM_ENVIO.IGNORADO}
                onChange={() => toggleItem(itemId)}
                aria-label={`Selecionar ${item.nomeArquivoOriginal}`}
              />
            ),
          },
          {
            label: "CPF/CNPJ",
            value: exibirDocumento(item.documentoMascarado),
          },
          { label: "E-mail", value: emailInfo.texto },
          {
            label: "Método",
            value: labelMetodoIdentificacao(item.metodoIdentificacao),
          },
          {
            label: "Status",
            value: (
              <>
                <span
                  className={`page-envio-boletos__badge page-envio-boletos__badge--${indicador.cor}`}
                >
                  {indicador.texto}
                </span>
                {bloqueio && itemBloqueiaEnvio(item) ? (
                  <span className="page-envio-boletos__bloqueio-item">{bloqueio}</span>
                ) : null}
              </>
            ),
          },
        ]}
        actions={
          <>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => visualizarPdf(itemId)}
            >
              PDF
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => abrirModalCorrigir(item)}
            >
              Corrigir
            </button>
            {status !== "IGNORADO" && (
              <button
                type="button"
                className="btn btn--danger btn--small"
                onClick={() => patchItem(itemId, "ignorar")}
              >
                Ignorar
              </button>
            )}
          </>
        }
      />
    </li>
  );
}
