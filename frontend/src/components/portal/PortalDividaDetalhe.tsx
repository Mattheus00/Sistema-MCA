import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPortalDivida, getApiErrorMessage } from "@/lib/portalApi";
import { diasAtrasoPortal, formatarDataPortal, formatarMoedaPortal } from "@/lib/portalUtils";
import type { PortalDividaDetalhe } from "@/types/api";

export default function PortalDividaDetalhe() {
  const { dividaId } = useParams<{ dividaId: string }>();
  const [divida, setDivida] = useState<PortalDividaDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!dividaId) return;
    let ativo = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchPortalDivida(dividaId);
        if (ativo) setDivida(data);
      } catch (e: unknown) {
        if (ativo) setErro(getApiErrorMessage(e, "Não foi possível carregar a dívida."));
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [dividaId]);

  if (loading) return <p className="portal-empty" role="status">Carregando…</p>;
  if (erro) return <p className="portal-auth__erro" role="alert">{erro}</p>;
  if (!divida) return <p className="portal-empty">Dívida não encontrada.</p>;

  const atraso = divida.diasAtraso ?? diasAtrasoPortal(divida.vencimento);
  const pagamentos = divida.pagamentos ?? [];

  return (
    <div className="portal-page">
      <Link to="/portal/dividas" className="portal-voltar">
        ← Voltar às dívidas
      </Link>

      <header className="portal-page__head">
        <h1 className="portal-page__titulo">{divida.descricao ?? "Detalhe da dívida"}</h1>
        {divida.protocolo && <p className="portal-page__subtitulo">Protocolo {divida.protocolo}</p>}
      </header>

      <div className="portal-detalhe-grid">
        <div className="portal-detalhe-item">
          <span className="portal-detalhe-label">Vencimento</span>
          <strong>{formatarDataPortal(divida.vencimento)}</strong>
        </div>
        <div className="portal-detalhe-item">
          <span className="portal-detalhe-label">Valor devedor</span>
          <strong>{formatarMoedaPortal(divida.valorDevedor)}</strong>
        </div>
        <div className="portal-detalhe-item">
          <span className="portal-detalhe-label">Status</span>
          <strong>{divida.status ?? "—"}</strong>
        </div>
        <div className="portal-detalhe-item">
          <span className="portal-detalhe-label">Dias em atraso</span>
          <strong>{atraso > 0 ? atraso : "—"}</strong>
        </div>
        {divida.valorOriginal != null && (
          <div className="portal-detalhe-item">
            <span className="portal-detalhe-label">Valor original</span>
            <strong>{formatarMoedaPortal(divida.valorOriginal)}</strong>
          </div>
        )}
        {divida.juros != null && divida.juros > 0 && (
          <div className="portal-detalhe-item">
            <span className="portal-detalhe-label">Juros</span>
            <strong>{formatarMoedaPortal(divida.juros)}</strong>
          </div>
        )}
      </div>

      <section className="portal-secao">
        <h2 className="portal-secao__titulo">Histórico de pagamentos</h2>
        {pagamentos.length === 0 ? (
          <p className="portal-empty">Nenhum pagamento registrado para esta dívida.</p>
        ) : (
          <>
            <ul className="portal-item-list portal-item-list--mobile">
              {pagamentos.map((p, i) => (
                <li key={p.id ?? i} className="portal-item-card portal-item-card--compacto">
                  <dl className="portal-item-card__grid">
                    <div>
                      <dt>Data</dt>
                      <dd>{formatarDataPortal(p.dataPagamento)}</dd>
                    </div>
                    <div>
                      <dt>Valor</dt>
                      <dd>{formatarMoedaPortal(p.valor)}</dd>
                    </div>
                    <div>
                      <dt>Método</dt>
                      <dd>{p.metodo ?? "—"}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
            <div className="portal-tabela-wrap portal-only-desktop">
              <table className="portal-tabela">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Método</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((p, i) => (
                    <tr key={p.id ?? i}>
                      <td>{formatarDataPortal(p.dataPagamento)}</td>
                      <td>{formatarMoedaPortal(p.valor)}</td>
                      <td>{p.metodo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
