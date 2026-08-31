import { useEffect, useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { clearAuthSession, getAuthToken, getAuthUserDisplay, getAuthUserProfile, isMockEnabled } from '@/lib/api'
import { obterContagemDocumentosNovos, DOCUMENTOS_CLIENTES_RESUMO_INVALIDATE_EVENT } from '@/lib/documentosClientesApi'
import { iniciaisNome, labelPerfilUsuario } from '@/lib/dashboardUtils'

type NavItem = {
  to: string
  label: string
  icon: ComponentType
  badge?: string
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function ServicesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M9 16h6" />
    </svg>
  )
}

function CalculatorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      <path d="M4 20h4" />
      <path d="M4 16v4" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function DocumentosPortalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18v-6" />
      <path d="M9 15h6" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
    </svg>
  )
}

function NavPill({
  to,
  label,
  icon: Icon,
  badge,
  onNavigate,
}: NavItem & { onNavigate?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      className={({ isActive }) => `app-nav-pill${isActive ? ' app-nav-pill--active' : ''}`}
      onClick={onNavigate}
    >
      <span className="app-nav-pill__icon">
        <Icon />
      </span>
      <span className="app-nav-pill__label">{label}</span>
      {badge && <span className="app-nav-pill__badge">{badge}</span>}
    </NavLink>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const showSair = !isMockEnabled() && !!getAuthToken()
  const userDisplay = getAuthUserDisplay() || 'Usuário'
  const userProfile = getAuthUserProfile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isProprietaria = userProfile === 'PROPRIETARIA'
  const isFuncionario = userProfile === 'FUNCIONARIO'
  const podeVerEnvioBoletos = userProfile === 'PROPRIETARIA' || userProfile === 'RESPONSAVEL_FINANCEIRO'
  const podeVerDocumentosPortal = podeVerEnvioBoletos
  const podeVerLivroCaixa = podeVerEnvioBoletos
  const [badgeDocumentos, setBadgeDocumentos] = useState(0)
  const navItems: NavItem[] = isFuncionario
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
        ...(podeVerLivroCaixa ? [{ to: '/livro-caixa', label: 'Livro Caixa', icon: WalletIcon }] : []),
        ...(podeVerEnvioBoletos ? [{ to: '/envio-boletos', label: 'Envio de boletos', icon: EmailAttachIcon, badge: 'Novo' }] : []),
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

  function fecharMenuMobile() {
    setMobileMenuOpen(false)
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
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <div className={`app-layout${mobileMenuOpen ? ' app-layout--nav-open' : ''}`}>
      <header className="app-header">
        <div className="app-header__bar">
          <button
            type="button"
            className="app-header__menu-btn"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
          >
            <MenuIcon open={mobileMenuOpen} />
          </button>

          <Link to="/" className="app-header__brand" aria-label="Contabilidade São Judas Tadeu — ir para página institucional">
            <span className="app-header__brand-logo">
              <LogoIcon />
            </span>
          </Link>

          <nav className="app-header__nav app-header__nav--desktop" aria-label="Menu principal">
            {navItems.map((item) => (
              <NavPill key={item.to} {...item} />
            ))}
          </nav>

          <div className="app-header__actions">
            <div className="app-header__user" aria-label="Usuário logado">
              <span className="app-header__user-avatar" aria-hidden="true">
                {iniciaisNome(userDisplay)}
              </span>
              <span className="app-header__user-info">
                <span className="app-header__user-name" title={userDisplay}>
                  {userDisplay}
                </span>
                <span className="app-header__user-role">{labelPerfilUsuario(userProfile)}</span>
              </span>
            </div>
            {showSair && (
              <button type="button" className="app-header__logout" onClick={handleSair}>
                Sair
              </button>
            )}
          </div>
        </div>

        {mobileMenuOpen && (
          <>
            <button
              type="button"
              className="app-nav-backdrop"
              onClick={fecharMenuMobile}
              aria-label="Fechar menu"
            />
            <nav className="app-header__nav app-header__nav--mobile" aria-label="Menu principal mobile">
              <div className="app-header__mobile-user">
                <span className="app-header__user-avatar" aria-hidden="true">
                  {iniciaisNome(userDisplay)}
                </span>
                <span className="app-header__user-info">
                  <span className="app-header__user-name">{userDisplay}</span>
                  <span className="app-header__user-role">{labelPerfilUsuario(userProfile)}</span>
                </span>
              </div>
              {navItems.map((item) => (
                <NavPill key={item.to} {...item} onNavigate={fecharMenuMobile} />
              ))}
              {showSair && (
                <button type="button" className="app-header__logout app-header__logout--mobile" onClick={handleSair}>
                  Sair
                </button>
              )}
            </nav>
          </>
        )}
      </header>

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

function LogoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
