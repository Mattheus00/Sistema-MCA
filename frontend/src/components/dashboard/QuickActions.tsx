import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthUserProfile } from "@/lib/api";

type Acao = {
  id: string;
  label: string;
  rota: string;
  icon: ReactNode;
  perfis?: string[];
};

function podeVerEnvioBoletos(): boolean {
  const perfil = getAuthUserProfile();
  return perfil === "PROPRIETARIA" || perfil === "RESPONSAVEL_FINANCEIRO";
}

const ACOES: Acao[] = [
  {
    id: "cliente",
    label: "Novo cliente",
    rota: "/clientes",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
  {
    id: "inadimplencia",
    label: "Nova inadimplência",
    rota: "/inadimplentes/registrar",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    id: "pagamento",
    label: "Registrar pagamento",
    rota: "/inadimplentes",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    id: "boletos",
    label: "Enviar boletos",
    rota: "/envio-boletos",
    perfis: ["PROPRIETARIA", "RESPONSAVEL_FINANCEIRO"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 4h16v16H4z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    id: "relatorios",
    label: "Relatórios",
    rota: "/relatorios",
    perfis: ["PROPRIETARIA", "RESPONSAVEL_FINANCEIRO"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

const ACOES_FUNCIONARIO = new Set(["cliente", "inadimplencia", "pagamento"]);

export function QuickActions() {
  const navigate = useNavigate();
  const perfil = getAuthUserProfile();
  const acoesVisiveis = ACOES.filter((acao) => {
    if (perfil === "FUNCIONARIO") return ACOES_FUNCIONARIO.has(acao.id);
    if (acao.perfis) return perfil != null && acao.perfis.includes(perfil);
    return true;
  });

  return (
    <section className="dash-card" aria-labelledby="dash-acoes-titulo">
      <h2 id="dash-acoes-titulo" className="dash-card__title">
        Ações rápidas
      </h2>
      <div className="dash-quick-actions">
        {acoesVisiveis.map((acao) => (
          <button
            key={acao.id}
            type="button"
            className="dash-quick-actions__item"
            onClick={() => navigate(acao.rota)}
          >
            <span className="dash-quick-actions__icon" aria-hidden="true">
              {acao.icon}
            </span>
            <span>{acao.label}</span>
          </button>
        ))}
      </div>
      {perfil !== "FUNCIONARIO" && <BoletosBanner />}
    </section>
  );
}

export function BoletosBanner() {
  const navigate = useNavigate();
  const habilitado = podeVerEnvioBoletos();

  return (
    <aside className="dash-boletos-banner" aria-label="Destaque envio de boletos">
      <p>Envie boletos de cobrança por e-mail de forma rápida e segura.</p>
      <button
        type="button"
        className="btn btn--primary dash-boletos-banner__btn"
        onClick={() => habilitado && navigate("/envio-boletos")}
        disabled={!habilitado}
        title={habilitado ? undefined : "Disponível para perfis financeiros autorizados"}
      >
        Acessar envio de boletos
      </button>
    </aside>
  );
}
