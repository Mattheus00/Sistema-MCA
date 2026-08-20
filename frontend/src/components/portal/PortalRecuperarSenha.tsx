import { Link } from "react-router-dom";
import PortalAuthShell from "./PortalAuthShell";

export default function PortalRecuperarSenha() {
  return (
    <PortalAuthShell
      titulo="Recuperar senha"
      subtitulo="Para redefinir sua senha de acesso ao portal, entre em contato com o escritório MCA pelo telefone ou WhatsApp informado no seu contrato de prestação de serviços."
      heroTitulo="Precisa de ajuda?"
      heroSubtitulo="Nossa equipe pode redefinir seu acesso com segurança."
    >
      <div className="portal-auth__links">
        <Link to="/portal/login">Voltar ao login</Link>
        <Link to="/">Voltar ao site</Link>
      </div>
    </PortalAuthShell>
  );
}
