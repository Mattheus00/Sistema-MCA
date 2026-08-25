import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { clearAuthSession, getAuthToken, getAuthUserDisplay, getAuthUserProfile, isMockEnabled } from '@/lib/api'
import { obterContagemDocumentosNovos, DOCUMENTOS_CLIENTES_RESUMO_INVALIDATE_EVENT } from '@/lib/documentosClientesApi'
import { iniciaisNome, labelPerfilUsuario } from '@/lib/dashboardUtils'
import { MOBILE_MAX_WIDTH_QUERY, useMediaQuery } from '@/lib/useMediaQuery'

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function ServicesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M9 16h6" />
    </svg>
  )
}

function CalculatorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8" />
      <path d="M8 10h1" />
      <path d="M11 10h1" />
      <path d="M14 10h1" />
      <path d="M8 14h1" />
      <path d="M11 14h1" />
      <path d="M14 14h1" />
      <path d="M17 10h-1" />
      <path d="M17 14h-1" />
    </svg>
  )
}

function EmailAttachIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      <path d="M4 20h4" />
      <path d="M4 16v4" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function DocumentosPortalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18v-6" />
      <path d="M9 15h6" />
    </svg>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const SIDEBAR_HIDDEN_KEY = 'sgi_sidebar_hidden'
  const showSair = !isMockEnabled() && !!getAuthToken()
  const userDisplay = getAuthUserDisplay() || 'Usuário'
  const userProfile = getAuthUserProfile()
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useMediaQuery(MOBILE_MAX_WIDTH_QUERY)
  const isProprietaria = userProfile === 'PROPRIETARIA'
  const isFuncionario = userProfile === 'FUNCIONARIO'
  const podeVerEnvioBoletos = userProfile === 'PROPRIETARIA' || userProfile === 'RESPONSAVEL_FINANCEIRO'
  const podeVerDocumentosPortal = podeVerEnvioBoletos
  const [badgeDocumentos, setBadgeDocumentos] = useState(0)
  const navItems = isFuncionario
    ? [
        { to: '/clientes', label: 'Clientes', icon: PeopleIcon },
        { to: '/inadimplentes', label: 'Inadimplentes', icon: AlertIcon },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: GridIcon },
        { to: '/clientes', label: 'Clientes', icon: PeopleIcon },
        { to: '/inadimplentes', label: 'Inadimplentes', icon: AlertIcon },
        { to: '/servicos', label: 'Serviços', icon: ServicesIcon },
        { to: '/reforma-tributaria', label: 'Simulador', icon: CalculatorIcon },
        { to: '/relatorios', label: 'Relatórios', icon: ChartIcon },
        ...(podeVerEnvioBoletos ? [{ to: '/envio-boletos', label: 'Envio de boletos', icon: EmailAttachIcon, badge: 'Novo' as const }] : []),
        ...(podeVerDocumentosPortal
          ? [{
              to: '/documentos-clientes',
              label: 'Documentos do portal',
              icon: DocumentosPortalIcon,
              badge: badgeDocumentos > 0 ? String(badgeDocumentos > 9 ? '9+' : badgeDocumentos) : undefined,
            }]
          : []),
        ...(isProprietaria ? [{ to: '/usuarios', label: 'Usuários', icon: UserIcon }] : []),
      ]

  function handleSair() {
    clearAuthSession()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    if (!podeVerDocumentosPortal) return
    let ativo = true
    function atualizarBadge() {
      obterContagemDocumentosNovos()
        .then((n) => {
          if (ativo) setBadgeDocumentos(n)
        })
        .catch(() => {})
    }
    atualizarBadge()
    window.addEventListener(DOCUMENTOS_CLIENTES_RESUMO_INVALIDATE_EVENT, atualizarBadge)
    return () => {
      ativo = false
      window.removeEventListener(DOCUMENTOS_CLIENTES_RESUMO_INVALIDATE_EVENT, atualizarBadge)
    }
  }, [podeVerDocumentosPortal, location.pathname])

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    setSidebarHidden(localStorage.getItem(SIDEBAR_HIDDEN_KEY) === '1')
  }, [])

  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(SIDEBAR_HIDDEN_KEY, sidebarHidden ? '1' : '0')
  }, [sidebarHidden])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false)
      return
    }
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobile, mobileMenuOpen])

  useEffect(() => {
    function onResize() {
      if (window.matchMedia(MOBILE_MAX_WIDTH_QUERY).matches) return
      setMobileMenuOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div
      className={[
        'app-layout',
        sidebarHidden && !isMobile ? 'app-layout--sidebar-hidden' : '',
        mobileMenuOpen ? 'app-layout--drawer-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-topbar__menu-btn"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileMenuOpen}
        >
          <MenuIcon open={mobileMenuOpen} />
        </button>
        <div className="admin-topbar__brand">
          <LogoIcon />
          <span className="admin-topbar__titulo">SGI</span>
        </div>
      </header>
      {mobileMenuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Fechar menu"
        />
      )}
      {!isMobile && sidebarHidden && (
        <button
          type="button"
          className="sidebar-handle sidebar-handle--floating"
          onClick={() => setSidebarHidden(false)}
          aria-label="Mostrar barra lateral"
          title="Mostrar menu"
        >
          <ChevronIcon direction="right" />
        </button>
      )}
      {!isMobile && !sidebarHidden && (
        <button
          type="button"
          className="sidebar-handle sidebar-handle--edge"
          onClick={() => setSidebarHidden(true)}
          aria-label="Esconder barra lateral"
          title="Esconder menu"
        >
          <ChevronIcon direction="left" />
        </button>
      )}
      <aside className="sidebar sidebar--drawer">
        <Link to="/" className="sidebar-brand" aria-label="Ir para a página institucional">
          <div className="sidebar-brand__logo">
            <LogoIcon />
          </div>
          <div className="sidebar-brand__textos">
            <span className="sidebar-brand__titulo">Contabilidade Sao Judas Tadeu</span>
            <span className="sidebar-brand__subtitulo">Sistema de Gerenciamento de Inadimplentes</span>
          </div>
        </Link>
        <div className="sidebar-user" aria-label="Usuário logado">
          <span className="sidebar-user__avatar" aria-hidden="true">
            {iniciaisNome(userDisplay)}
          </span>
          <span className="sidebar-user__info">
            <span className="sidebar-user__name" title={userDisplay}>
              {userDisplay}
            </span>
            <span className="sidebar-user__role">{labelPerfilUsuario(userProfile)}</span>
          </span>
        </div>
        <nav className="sidebar-nav" aria-label="Menu">
          {navItems.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
              onClick={() => {
                setMobileMenuOpen(false)
              }}
            >
              <Icon />
              <span className="sidebar-link__label">{label}</span>
              {badge && <span className="sidebar-link__badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>
        {showSair && (
          <div className="sidebar-sair">
            <button type="button" className="sidebar-sair__btn" onClick={handleSair}>
              Sair
            </button>
          </div>
        )}
      </aside>
      <div className="main-wrapper">
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  const d = direction === 'left' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

function LogoIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="28" r="4" fill="#A43F9B" />
      <circle cx="12" cy="28" r="4" fill="#A43F9B" />
      <circle cx="20" cy="28" r="4" fill="#A43F9B" />
      <circle cx="28" cy="28" r="4" fill="#A43F9B" />
      <circle cx="12" cy="20" r="4" fill="#A43F9B" />
      <circle cx="20" cy="20" r="4" fill="#A43F9B" />
      <circle cx="28" cy="20" r="4" fill="#A43F9B" />
      <circle cx="20" cy="12" r="4" fill="#A43F9B" />
      <circle cx="28" cy="12" r="4" fill="#A43F9B" />
      <circle cx="28" cy="4" r="4" fill="#A43F9B" />
    </svg>
  )
}
