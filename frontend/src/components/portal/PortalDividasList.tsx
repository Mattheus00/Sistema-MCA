import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPortalDividas, getApiErrorMessage } from "@/lib/portalApi";
import { diasAtrasoPortal, formatarDataPortal, formatarMoedaPortal, labelStatusDividaPortal } from "@/lib/portalUtils";
import type { PortalDivida } from "@/types/api";

export default function PortalDividasList() {
  const [dividas, setDividas] = useState<PortalDivida[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchPortalDividas("abertas");
        if (ativo) setDividas(data);
      } catch (e: unknown) {
        if (ativo) setErro(getApiErrorMessage(e, "Não foi possível carregar as dívidas."));
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="portal-page">
      <section className="portal-panel">
      <header className="portal-page__head">
        <h1 className="portal-page__titulo">Minhas dívidas</h1>
        <p className="portal-page__subtitulo">Consulte protocolo, vencimento e valor devedor.</p>
      </header>

      {erro && (
        <p className="portal-auth__erro" role="alert">
          {erro}
        </p>
      )}

      {loading ? (
        <p className="portal-empty" role="status">
          Carregando…
        </p>
      ) : dividas.length === 0 ? (
        <p className="portal-empty" role="status">
          Nenhuma dívida em aberto.
        </p>
      ) : (
        <>
          <ul className="portal-item-list portal-item-list--mobile">
            {dividas.map((d) => (
              <DividaCard key={d.id} divida={d} />
            ))}
          </ul>

          <div className="portal-tabela-wrap portal-only-desktop">
            <table className="portal-tabela">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Atraso</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dividas.map((d) => {
                  const atraso = d.diasAtraso ?? diasAtrasoPortal(d.vencimento);
                  return (
                    <tr key={d.id}>
                      <td>{d.protocolo ?? "—"}</td>
                      <td>{d.descricao ?? "—"}</td>
                      <td>{formatarDataPortal(d.vencimento)}</td>
                      <td>{formatarMoedaPortal(d.valorDevedor)}</td>
                      <td>{labelStatusDividaPortal(d.status, d.vencimento)}</td>
                      <td>{atraso > 0 ? `${atraso} dias` : "—"}</td>
                      <td>
                        <Link to={`/portal/dividas/${d.id}`} className="portal-link">
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      </section>
    </div>
  );
}

function DividaCard({ divida: d }: { divida: PortalDivida }) {
  const atraso = d.diasAtraso ?? diasAtrasoPortal(d.vencimento);
  return (
    <li className="portal-item-card">
      <div className="portal-item-card__top">
        <div className="portal-item-card__titulo-wrap">
          <p className="portal-item-card__titulo">{d.descricao ?? "Dívida"}</p>
          {d.protocolo && <p className="portal-item-card__meta-linha">Protocolo {d.protocolo}</p>}
        </div>
        <p className="portal-item-card__valor">{formatarMoedaPortal(d.valorDevedor)}</p>
      </div>
      <dl className="portal-item-card__grid">
        <div>
          <dt>Vencimento</dt>
          <dd>{formatarDataPortal(d.vencimento)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{labelStatusDividaPortal(d.status, d.vencimento)}</dd>
        </div>
        <div>
          <dt>Atraso</dt>
          <dd>{atraso > 0 ? `${atraso} dias` : "—"}</dd>
        </div>
      </dl>
      <Link to={`/portal/dividas/${d.id}`} className="portal-btn portal-btn--secondary portal-item-card__acao">
        Ver detalhes
      </Link>
    </li>
  );
}
