import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import PortalProtectedRoute from '@/components/portal/PortalProtectedRoute'
import PortalLayout from '@/components/portal/PortalLayout'
import PortalLogin from '@/components/portal/PortalLogin'
import PortalPrimeiroAcesso from '@/components/portal/PortalPrimeiroAcesso'
import PortalRecuperarSenha from '@/components/portal/PortalRecuperarSenha'
import PortalDashboard from '@/components/portal/PortalDashboard'
import PortalDividasList from '@/components/portal/PortalDividasList'
import PortalDividaDetalhe from '@/components/portal/PortalDividaDetalhe'
import PortalDocumentos from '@/components/portal/PortalDocumentos'
import Dashboard from '@/components/pages/Dashboard'
import WebClientes from '@/components/pages/WebClientes'
import WebInadimplentes from '@/components/pages/WebInadimplentes'
import WebInadimplentesRegistro from '@/components/pages/WebInadimplentesRegistro'
import WebInadimplentesHonorarios from '@/components/pages/WebInadimplentesHonorarios'
import WebRelatorios from '@/components/pages/WebRelatorios'
import WebServicos from '@/components/pages/WebServicos'
import WebReformaTributaria from '@/components/pages/WebReformaTributaria'
import WebEnvioBoletos from '@/components/pages/WebEnvioBoletos'
import WebDocumentosClientes from '@/components/pages/WebDocumentosClientes'
import WebCadastroUsuario from '@/components/pages/WebCadastroUsuario'
import WebUsuarios from '@/components/pages/WebUsuarios'
import Login from '@/components/pages/Login'
import LandingPage from '@/components/pages/LandingPage'
import './App.css'
import './styles/portal.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/primeiro-acesso" element={<PortalPrimeiroAcesso />} />
      <Route path="/portal/recuperar-senha" element={<PortalRecuperarSenha />} />
      <Route element={<PortalProtectedRoute />}>
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<Navigate to="/portal/inicio" replace />} />
          <Route path="/portal/inicio" element={<PortalDashboard />} />
          <Route path="/portal/dividas" element={<PortalDividasList />} />
          <Route path="/portal/dividas/:dividaId" element={<PortalDividaDetalhe />} />
          <Route path="/portal/documentos" element={<PortalDocumentos />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/clientes" element={<WebClientes />} />
          <Route path="/inadimplentes" element={<WebInadimplentes />} />
          <Route path="/inadimplentes/registrar" element={<WebInadimplentesRegistro />} />
          <Route path="/inadimplentes/:clienteId/honorarios" element={<WebInadimplentesHonorarios />} />

          <Route element={<ProtectedRoute denyFuncionario />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/servicos" element={<WebServicos />} />
            <Route path="/relatorios" element={<WebRelatorios />} />
            <Route path="/envio-boletos" element={<WebEnvioBoletos />} />
            <Route path="/documentos-clientes" element={<WebDocumentosClientes />} />
            <Route path="/reforma-tributaria" element={<WebReformaTributaria />} />
          </Route>

          <Route element={<ProtectedRoute onlyProprietaria />}>
            <Route path="/usuarios" element={<WebUsuarios />} />
            <Route path="/usuarios/cadastro" element={<WebCadastroUsuario />} />
            <Route path="/usuarios/pendentes" element={<Navigate to="/usuarios?aba=pendentes" replace />} />
            <Route path="/usuarios/ativos" element={<Navigate to="/usuarios" replace />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
