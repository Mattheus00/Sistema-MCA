import type { ReactNode } from "react";

type Props = {
  titulo: string;
  subtitulo?: string;
  heroTitulo?: string;
  heroSubtitulo?: string;
  children: ReactNode;
};

export default function PortalAuthShell({
  titulo,
  subtitulo,
  heroTitulo = "Área do Cliente",
  heroSubtitulo = "Acompanhe suas dívidas e envie documentos com segurança.",
  children,
}: Props) {
  return (
    <div className="portal-app portal-auth">
      <div className="portal-auth__hero">
        <span className="portal-auth__logo" aria-hidden="true">
          MCA
        </span>
        <h1 className="portal-auth__hero-titulo">{heroTitulo}</h1>
        <p className="portal-auth__hero-subtitulo">{heroSubtitulo}</p>
      </div>
      <div className="portal-auth__sheet">
        <div className="portal-auth__card">
          <h2 className="portal-auth__titulo">{titulo}</h2>
          {subtitulo && <p className="portal-auth__subtitulo">{subtitulo}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
