import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import PortalProtectedRoute from "@/components/portal/PortalProtectedRoute";
import Login from "@/components/pages/Login";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import "@/styles/components/shared.css";
import "./styles/portal.css";

// Páginas carregadas sob demanda (code splitting por rota).
const LandingPage = lazy(() => import("@/components/pages/LandingPage"));
const PortalLayout = lazy(() => import("@/components/portal/PortalLayout"));
const PortalLogin = lazy(() => import("@/components/portal/PortalLogin"));
const PortalPrimeiroAcesso = lazy(() => import("@/components/portal/PortalPrimeiroAcesso"));
const PortalRecuperarSenha = lazy(() => import("@/components/portal/PortalRecuperarSenha"));
const PortalDashboard = lazy(() => import("@/components/portal/PortalDashboard"));
const PortalDividasList = lazy(() => import("@/components/portal/PortalDividasList"));
const PortalDividaDetalhe = lazy(() => import("@/components/portal/PortalDividaDetalhe"));
const PortalDocumentos = lazy(() => import("@/components/portal/PortalDocumentos"));
const Dashboard = lazy(() => import("@/components/pages/Dashboard"));
const WebClientes = lazy(() => import("@/components/pages/WebClientes"));
const WebInadimplentes = lazy(() => import("@/components/pages/WebInadimplentes"));
const WebInadimplentesRegistro = lazy(() => import("@/components/pages/WebInadimplentesRegistro"));
const WebInadimplentesHonorarios = lazy(
  () => import("@/components/pages/WebInadimplentesHonorarios"),
);
const WebRelatorios = lazy(() => import("@/components/pages/WebRelatorios"));
const WebServicos = lazy(() => import("@/components/pages/WebServicos"));
const WebReformaTributaria = lazy(() => import("@/components/pages/WebReformaTributaria"));
const WebEnvioBoletos = lazy(() => import("@/components/pages/WebEnvioBoletos"));
const WebDocumentosClientes = lazy(() => import("@/components/pages/WebDocumentosClientes"));
const WebLivroCaixa = lazy(() => import("@/components/pages/WebLivroCaixa"));
const WebTarefas = lazy(() => import("@/components/pages/WebTarefas"));
const WebCadastroUsuario = lazy(() => import("@/components/pages/WebCadastroUsuario"));
const WebUsuarios = lazy(() => import("@/components/pages/WebUsuarios"));

function App() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
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
            <Route
              path="/inadimplentes/:clienteId/honorarios"
              element={<WebInadimplentesHonorarios />}
            />
            <Route path="/tarefas" element={<WebTarefas />} />

            <Route element={<ProtectedRoute denyFuncionario />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/servicos" element={<WebServicos />} />
              <Route path="/relatorios" element={<WebRelatorios />} />
              <Route path="/envio-boletos" element={<WebEnvioBoletos />} />
              <Route path="/documentos-clientes" element={<WebDocumentosClientes />} />
              <Route path="/reforma-tributaria" element={<WebReformaTributaria />} />
            </Route>

            <Route element={<ProtectedRoute onlyFinanceiro />}>
              <Route path="/livro-caixa" element={<WebLivroCaixa />} />
            </Route>

            <Route element={<ProtectedRoute onlyProprietaria />}>
              <Route path="/usuarios" element={<WebUsuarios />} />
              <Route path="/usuarios/cadastro" element={<WebCadastroUsuario />} />
              <Route
                path="/usuarios/pendentes"
                element={<Navigate to="/usuarios?aba=pendentes" replace />}
              />
              <Route path="/usuarios/ativos" element={<Navigate to="/usuarios" replace />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
