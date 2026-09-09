import AdminItemCard from "@/components/ui/AdminItemCard";
import ResponsiveList from "@/components/ui/ResponsiveList";
import { STATUS_LOTE_ENVIO } from "@/lib/constants/status";
import { formatarDataHora } from "@/lib/valorBrasil";
import type { LoteEnvioBoletoResumo } from "@/types/api";

type HistoricoLotesProps = {
  filtroDataInicio: string;
  filtroDataFim: string;
  filtroStatus: string;
  setFiltroDataInicio: (valor: string) => void;
  setFiltroDataFim: (valor: string) => void;
  setFiltroStatus: (valor: string) => void;
  carregarHistorico: (page: number) => void;
  abrirDetalheHistorico: (loteId: string) => void;
  historico: LoteEnvioBoletoResumo[];
  historicoPagina: number;
  historicoTotalPaginas: number;
  loading: boolean;
};

export default function HistoricoLotes({
  filtroDataInicio,
  filtroDataFim,
  filtroStatus,
  setFiltroDataInicio,
  setFiltroDataFim,
  setFiltroStatus,
  carregarHistorico,
  abrirDetalheHistorico,
  historico,
  historicoPagina,
  historicoTotalPaginas,
  loading,
}: HistoricoLotesProps) {
  return (
    <section className="page-envio-boletos__historico">
      <div className="page-envio-boletos__filtros">
        <input
          type="date"
          className="page-envio-boletos__input"
          value={filtroDataInicio}
          onChange={(e) => setFiltroDataInicio(e.target.value)}
          aria-label="Data início"
        />
        <input
          type="date"
          className="page-envio-boletos__input"
          value={filtroDataFim}
          onChange={(e) => setFiltroDataFim(e.target.value)}
          aria-label="Data fim"
        />
        <select
          className="page-envio-boletos__input"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          aria-label="Status"
        >
          <option value="">Todos os status</option>
          <option value={STATUS_LOTE_ENVIO.CONCLUIDO}>Concluído</option>
          <option value={STATUS_LOTE_ENVIO.CONFERENCIA}>Conferência</option>
          <option value={STATUS_LOTE_ENVIO.ENVIANDO}>Enviando</option>
          <option value={STATUS_LOTE_ENVIO.CANCELADO}>Cancelado</option>
        </select>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => carregarHistorico(0)}
          disabled={loading}
        >
          Filtrar
        </button>
      </div>

      <p className="page-envio-boletos__historico-dica">
        Clique em um lote para ver os detalhes do envio por cliente.
      </p>

      <ResponsiveList
        desktop={
          <div className="page-envio-boletos__tabela-wrap">
            <table className="page-envio-boletos__tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Itens</th>
                  <th>Enviados</th>
                  <th>Erros</th>
                  <th>Criado por</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="page-envio-boletos__vazio">
                      Carregando...
                    </td>
                  </tr>
                ) : historico.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="page-envio-boletos__vazio">
                      Nenhum lote encontrado.
                    </td>
                  </tr>
                ) : (
                  historico.map((h) => (
                    <tr
                      key={h.loteId}
                      className="page-envio-boletos__linha-clicavel"
                      title="Clique para ver detalhes"
                      onClick={() => abrirDetalheHistorico(h.loteId)}
                      onKeyDown={(e) => e.key === "Enter" && abrirDetalheHistorico(h.loteId)}
                      tabIndex={0}
                      role="button"
                    >
                      <td>{formatarDataHora(h.criadoEm)}</td>
                      <td>{h.status}</td>
                      <td>{h.totalItens ?? "—"}</td>
                      <td>{h.enviados ?? "—"}</td>
                      <td>{h.erros ?? "—"}</td>
                      <td>{h.criadoPor?.trim() || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        }
        mobile={
          loading ? (
            <p className="page-envio-boletos__vazio">Carregando...</p>
          ) : historico.length === 0 ? (
            <p className="page-envio-boletos__vazio">Nenhum lote encontrado.</p>
          ) : (
            <ul className="admin-item-list">
              {historico.map((h) => (
                <li key={h.loteId}>
                  <AdminItemCard
                    title={formatarDataHora(h.criadoEm)}
                    meta={h.status}
                    onClick={() => abrirDetalheHistorico(h.loteId)}
                    fields={[
                      { label: "Itens", value: h.totalItens ?? "—" },
                      { label: "Enviados", value: h.enviados ?? "—" },
                      { label: "Erros", value: h.erros ?? "—" },
                      { label: "Criado por", value: h.criadoPor?.trim() || "—" },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )
        }
      />

      <div className="page-envio-boletos__paginacao">
        <button
          type="button"
          className="btn btn--secondary"
          disabled={historicoPagina <= 0 || loading}
          onClick={() => carregarHistorico(historicoPagina - 1)}
        >
          Anterior
        </button>
        <span>
          Página {historicoPagina + 1} de {historicoTotalPaginas}
        </span>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={historicoPagina + 1 >= historicoTotalPaginas || loading}
          onClick={() => carregarHistorico(historicoPagina + 1)}
        >
          Próxima
        </button>
      </div>
    </section>
  );
}
