import { Navigate, Outlet } from "react-router-dom";
import { getPortalToken } from "@/lib/portalSession";

export default function PortalProtectedRoute() {
  const token = getPortalToken();
  if (!token) return <Navigate to="/portal/login" replace />;
  return <Outlet />;
}
