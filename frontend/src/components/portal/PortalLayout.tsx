import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { fetchPortalDividas, fetchPortalResumo, getApiErrorMessage, logoutPortal } from "@/lib/portalApi";
import { getPortalClientName } from "@/lib/portalSession";
import {
  diasAtrasoPortal,
  formatarDataPortal,
  formatarMoedaPortal,
  labelStatusDividaPortal,
  statusDividaPortalClass,
} from "@/lib/portalUtils";
import type { PortalDivida } from "@/types/api";

const NAV_ITENS = [
  { to: "/portal/inicio", label: "Início", end: true, Icon: IconInicio },
  { to: "/portal/dividas", label: "Dívidas", end: false, Icon: IconDividas },
  { to: "/portal/documentos", label: "Documentos", end: false, Icon: IconDocumentos },
] as const;

export default function PortalLayout() {
  const navigate = useNavigate();
  const nome = getPortalClientName() ?? "Cliente";
  const primeiroNome = nome.trim().split(/\s+/)[0] || "Cliente";
  const inicial = primeiroNome.charAt(0).toUpperCase();
  const [menuAberto, setMenuAberto] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [alertas, setAlertas] = useState(0);
  const [dividasAbertas, setDividasAbertas] = useState<PortalDivida[]>([]);
  const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
  const [erroNotificacoes, setErroNotificacoes] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificacoesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAberto && !notificacoesAbertas) return;
    function fechar(e: MouseEvent) {
      const alvo = e.target as Node;
      if (menuAberto && menuRef.current && !menuRef.current.contains(alvo)) {
        setMenuAberto(false);
      }
      if (notificacoesAbertas && notificacoesRef.current && !notificacoesRef.current.contains(alvo)) {
        setNotificacoesAbertas(false);
      }
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [menuAberto, notificacoesAbertas]);

  async function carregarDividasAbertas() {
    try {
      setLoadingNotificacoes(true);
      setErroNotificacoes(null);
      const data = await fetchPortalDividas("abertas");
      setDividasAbertas(data);
      setAlertas(data.filter((d) => diasAtrasoPortal(d.vencimento) > 0).length);
    } catch (e: unknown) {
      setErroNotificacoes(getApiErrorMessage(e, "Não foi possível carregar as dívidas."));
    } finally {
      setLoadingNotificacoes(false);
    }
  }

  function alternarNotificacoes() {
    setMenuAberto(false);
    setNotificacoesAbertas((aberto) => {
      const proximo = !aberto;
      if (proximo) void carregarDividasAbertas();
      return proximo;
    });
  }

  useEffect(() => {
    let ativo = true;
    fetchPortalResumo()
      .then((r) => {
        if (ativo) setAlertas(r.quantidadeDividasVencidas ?? 0);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  function sair() {
    setMenuAberto(false);
    setNotificacoesAbertas(false);
    logoutPortal();
    navigate("/portal/login", { replace: true });
  }

  return (
    <div className="portal-app portal-shell">
      <header className="portal-topbar">
        <div className="portal-topbar__brand">
          <span className="portal-topbar__logo" aria-hidden="true">
            MCA
          </span>
          <div className="portal-topbar__texto">
            <p className="portal-topbar__titulo">Área do Cliente</p>
            <p className="portal-topbar__subtitulo">Olá, {primeiroNome}</p>
          </div>
        </div>

        <nav className="portal-topbar__nav" aria-label="Menu principal">
          {NAV_ITENS.map(({ to, label, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `portal-topbar__nav-link${isActive ? " portal-topbar__nav-link--ativa" : ""}`
              }
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="portal-topbar__acoes">
          <div className="portal-topbar__notificacoes" ref={notificacoesRef}>
            <button
              type="button"
              className={`portal-topbar__icone-btn${notificacoesAbertas ? " portal-topbar__icone-btn--ativa" : ""}`}
              aria-label="Notificações"
              aria-expanded={notificacoesAbertas}
              aria-haspopup="dialog"
              onClick={alternarNotificacoes}
            >
              <IconSino />
              {alertas > 0 && <span className="portal-topbar__badge">{alertas > 9 ? "9+" : alertas}</span>}
            </button>

            {notificacoesAbertas && (
              <div className="portal-topbar__notif-panel" role="dialog" aria-label="Dívidas em aberto">
                <header className="portal-topbar__notif-head">
                  <h2 className="portal-topbar__notif-titulo">Dívidas em aberto</h2>
                  {!loadingNotificacoes && !erroNotificacoes && (
                    <p className="portal-topbar__notif-subtitulo">
                      {dividasAbertas.length === 1
                        ? "1 pendência encontrada"
                        : `${dividasAbertas.length} pendências encontradas`}
                    </p>
                  )}
                </header>

                {loadingNotificacoes ? (
                  <p className="portal-topbar__notif-status" role="status">
                    Carregando…
                  </p>
                ) : erroNotificacoes ? (
                  <p className="portal-topbar__notif-erro" role="alert">
                    {erroNotificacoes}
                  </p>
                ) : dividasAbertas.length === 0 ? (
                  <p className="portal-topbar__notif-status">Nenhuma dívida em aberto.</p>
                ) : (
                  <ul className="portal-topbar__notif-lista">
                    {dividasAbertas.map((divida) => {
                      const atraso = divida.diasAtraso ?? diasAtrasoPortal(divida.vencimento);
                      return (
                        <li key={divida.id}>
                          <Link
                            to={`/portal/dividas/${divida.id}`}
                            className="portal-topbar__notif-item"
                            onClick={() => setNotificacoesAbertas(false)}
                          >
                            <div className="portal-topbar__notif-item-topo">
                              <p className="portal-topbar__notif-item-titulo">
                                {divida.descricao ?? "Dívida em aberto"}
                              </p>
                              <p className="portal-topbar__notif-item-valor">
                                {formatarMoedaPortal(divida.valorDevedor)}
                              </p>
                            </div>
                            <div className="portal-topbar__notif-item-meta">
                              <span>Vence em {formatarDataPortal(divida.vencimento)}</span>
                              <span className={statusDividaPortalClass(divida.status, divida.vencimento)}>
                                {labelStatusDividaPortal(divida.status, divida.vencimento)}
                              </span>
                            </div>
                            {atraso > 0 && (
                              <p className="portal-topbar__notif-item-atraso">{atraso} dias em atraso</p>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="portal-topbar__notif-rodape">
                  <Link
                    to="/portal/dividas"
                    className="portal-topbar__notif-link"
                    onClick={() => setNotificacoesAbertas(false)}
                  >
                    Ver todas as dívidas
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="portal-topbar__perfil" ref={menuRef}>
            <button
              type="button"
              className="portal-topbar__avatar"
              onClick={() => {
                setNotificacoesAbertas(false);
                setMenuAberto((v) => !v);
              }}
              aria-expanded={menuAberto}
              aria-haspopup="menu"
              aria-label="Menu do perfil"
            >
              <span>{inicial}</span>
              <IconChevron />
            </button>
            {menuAberto && (
              <div className="portal-topbar__menu" role="menu">
                <p className="portal-topbar__menu-nome">{nome}</p>
                <button type="button" className="portal-topbar__menu-item" role="menuitem" onClick={sair}>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="portal-main">
        <div className="portal-main__inner">
          <Outlet />
        </div>
      </main>

      <nav className="portal-nav portal-nav--mobile" aria-label="Menu inferior">
        {NAV_ITENS.map(({ to, label, end, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `portal-nav__tab${isActive ? " portal-nav__tab--ativa" : ""}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconSino() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconInicio() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  );
}

function IconDividas() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h6" />
    </svg>
  );
}

function IconDocumentos() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}
