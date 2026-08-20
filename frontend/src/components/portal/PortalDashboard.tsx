import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPortalDividas, fetchPortalResumo, getApiErrorMessage } from "@/lib/portalApi";
import {
  diasParaVencimento,
  formatarDataPortal,
  formatarDataPortalExtenso,
  formatarMoedaPortal,
  labelStatusDividaPortal,
  obterProximoVencimento,
  ordenarDividasRecentes,
  statusDividaPortalClass,
} from "@/lib/portalUtils";
import type { PortalDivida, PortalResumo } from "@/types/api";

export default function PortalDashboard() {
  const [resumo, setResumo] = useState<PortalResumo | null>(null);
  const [dividas, setDividas] = useState<PortalDivida[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);
      const [resumoData, dividasData] = await Promise.all([
        fetchPortalResumo(),
        fetchPortalDividas("abertas"),
      ]);
      setResumo(resumoData);
      setDividas(dividasData);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Não foi possível carregar o resumo."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (loading) {
    return <p className="portal-empty" role="status">Carregando…</p>;
  }

  if (erro) {
    return <p className="portal-auth__erro" role="alert">{erro}</p>;
  }

  const proximo = obterProximoVencimento(dividas);
  const recentes = ordenarDividasRecentes(dividas, 3);
  const diasProximo = proximo ? diasParaVencimento(proximo.vencimento) : null;
  const progressoProximo =
    diasProximo != null && diasProximo >= 0
      ? Math.min(100, Math.max(8, ((30 - Math.min(diasProximo, 30)) / 30) * 100))
      : 0;

  return (
    <div className="portal-page portal-page--dashboard">
      <section className="portal-panel portal-panel--resumo">
        <header className="portal-panel__header">
          <div className="portal-panel__header-top">
            <div className="portal-panel__header-icone" aria-hidden="true">
              <IconGrafico />
            </div>
            <button type="button" className="portal-panel__refresh" onClick={carregar} aria-label="Atualizar resumo">
              <IconRefresh />
              <span className="portal-panel__refresh-label">Atualizar</span>
            </button>
          </div>
          <h1 className="portal-panel__titulo">Resumo financeiro</h1>
          <p className="portal-panel__subtitulo">Visão geral das suas pendências com o escritório.</p>
        </header>

        <div className="portal-metric-grid">
          <article className="portal-metric portal-metric--roxo">
            <div className="portal-metric__topo">
              <span className="portal-metric__icone" aria-hidden="true">
                <IconMoeda />
              </span>
              <span className="portal-metric__label">Saldo devedor total</span>
            </div>
            <p className="portal-metric__valor">{formatarMoedaPortal(resumo?.saldoDevedorTotal)}</p>
            <div className="portal-metric__decor" aria-hidden="true" />
          </article>

          <article className="portal-metric portal-metric--azul">
            <div className="portal-metric__topo">
              <span className="portal-metric__icone" aria-hidden="true">
                <IconLista />
              </span>
              <span className="portal-metric__label">Dívidas em aberto</span>
            </div>
            <p className="portal-metric__valor">{resumo?.quantidadeDividasAbertas ?? 0}</p>
          </article>

          <article className="portal-metric portal-metric--rosa">
            <div className="portal-metric__topo">
              <span className="portal-metric__icone" aria-hidden="true">
                <IconCalendario />
              </span>
              <span className="portal-metric__label">Dívidas vencidas</span>
            </div>
            <p className="portal-metric__valor">{resumo?.quantidadeDividasVencidas ?? 0}</p>
          </article>
        </div>

        <div className="portal-acoes-rapidas portal-acoes-rapidas--dashboard">
          <Link to="/portal/dividas" className="portal-btn portal-btn--primary">
            <IconLista />
            Ver minhas dívidas
          </Link>
          <Link to="/portal/documentos" className="portal-btn portal-btn--ghost">
            <IconUpload />
            Enviar documento
          </Link>
        </div>
      </section>

      <div className="portal-dash-grid">
        <section className="portal-panel">
          <header className="portal-panel__titulo-linha">
            <IconCalendario />
            <h2>Próximo vencimento</h2>
          </header>

          {proximo ? (
            <>
              <div className="portal-proximo">
                <p className="portal-proximo__data">{formatarDataPortalExtenso(proximo.vencimento)}</p>
                <p className="portal-proximo__descricao">{proximo.descricao ?? "Dívida"}</p>
                <p className="portal-proximo__valor">{formatarMoedaPortal(proximo.valorDevedor)}</p>
                {diasProximo != null && diasProximo >= 0 && (
                  <>
                    <p className="portal-proximo__prazo">
                      Vencimento em {diasProximo} {diasProximo === 1 ? "dia" : "dias"}
                    </p>
                    <div className="portal-proximo__barra" role="presentation">
                      <span style={{ width: `${progressoProximo}%` }} />
                    </div>
                  </>
                )}
                {diasProximo != null && diasProximo < 0 && (
                  <p className="portal-proximo__prazo portal-proximo__prazo--atraso">
                    Vencida há {Math.abs(diasProximo)} {Math.abs(diasProximo) === 1 ? "dia" : "dias"}
                  </p>
                )}
              </div>
              <Link to="/portal/dividas" className="portal-panel__link">
                Ver todas as dívidas
                <IconSeta />
              </Link>
            </>
          ) : (
            <p className="portal-empty portal-empty--inline">Nenhuma dívida em aberto.</p>
          )}
        </section>

        <section className="portal-panel">
          <header className="portal-panel__titulo-linha">
            <IconLista />
            <h2>Dívidas recentes</h2>
          </header>

          {recentes.length > 0 ? (
            <>
              <ul className="portal-recentes">
                {recentes.map((d) => (
                  <li key={d.id}>
                    <Link to={`/portal/dividas/${d.id}`} className="portal-recentes__item">
                      <div className="portal-recentes__info">
                        <p className="portal-recentes__titulo">{d.descricao ?? "Dívida"}</p>
                        <p className="portal-recentes__data">{formatarDataPortal(d.vencimento)}</p>
                      </div>
                      <div className="portal-recentes__direita">
                        <span className={statusDividaPortalClass(d.status, d.vencimento)}>
                          {labelStatusDividaPortal(d.status, d.vencimento)}
                        </span>
                        <span className="portal-recentes__valor">{formatarMoedaPortal(d.valorDevedor)}</span>
                        <IconSeta />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to="/portal/dividas" className="portal-panel__link">
                Ver todas
                <IconSeta />
              </Link>
            </>
          ) : (
            <p className="portal-empty portal-empty--inline">Nenhuma dívida recente.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function IconGrafico() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function IconMoeda() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconLista() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h6" />
    </svg>
  );
}

function IconCalendario() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconSeta() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
