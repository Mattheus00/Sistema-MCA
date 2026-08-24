import { Outlet, Navigate } from "react-router-dom";
import { getAuthToken, getAuthUserProfile, isMockEnabled } from "@/lib/api";

/**
 * Protege rotas que exigem autenticação.
 * Em modo mock não exige token; com backend real redireciona para /login se não houver token.
 */
type ProtectedRouteProps = {
  onlyProprietaria?: boolean;
  /** Bloqueia perfil FUNCIONARIO (acesso limitado a clientes/inadimplentes). */
  denyFuncionario?: boolean;
};

function rotaPadraoPorPerfil(perfil: string | null): string {
  return perfil === "FUNCIONARIO" ? "/clientes" : "/dashboard";
}

export default function ProtectedRoute({
  onlyProprietaria = false,
  denyFuncionario = false,
}: ProtectedRouteProps) {
  if (isMockEnabled() && !onlyProprietaria && !denyFuncionario) return <Outlet />;

  const token = getAuthToken();
  if (!isMockEnabled() && !token) return <Navigate to="/login" replace />;

  const perfil = getAuthUserProfile();

  if (onlyProprietaria && perfil !== "PROPRIETARIA") {
    return (
      <Navigate
        to={rotaPadraoPorPerfil(perfil)}
        replace
        state={{ erroPermissao: "Apenas a proprietária pode aprovar cadastros." }}
      />
    );
  }

  if (denyFuncionario && perfil === "FUNCIONARIO") {
    return <Navigate to="/clientes" replace />;
  }

  return <Outlet />;
}
