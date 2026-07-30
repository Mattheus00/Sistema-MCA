type DashboardHeaderProps = {
  dataInicio: string;
  dataFim: string;
  onDataInicioChange: (v: string) => void;
  onDataFimChange: (v: string) => void;
  onAtualizar: () => void;
  atualizando: boolean;
};

export function DashboardHeader({
  dataInicio,
  dataFim,
  onDataInicioChange,
  onDataFimChange,
  onAtualizar,
  atualizando,
}: DashboardHeaderProps) {
  return (
    <header className="dash-header">
      <div className="dash-header__textos">
        <h1 className="dash-header__title">Dashboard</h1>
        <p className="dash-header__subtitle">Visão geral do sistema de gestão de inadimplentes</p>
      </div>
      <div className="dash-header__acoes">
        <div className="dash-header__periodo" role="group" aria-label="Período do dashboard">
          <CalendarIcon />
          <label className="dash-header__filtro">
            <span className="visually-hidden">Data inicial</span>
          <input
            type="date"
            className="dash-header__input"
            value={dataInicio}
            onChange={(e) => onDataInicioChange(e.target.value)}
            aria-label="Data inicial do período"
          />
          </label>
          <span className="dash-header__periodo-separador" aria-hidden="true">–</span>
          <label className="dash-header__filtro">
            <span className="visually-hidden">Data final</span>
          <input
            type="date"
            className="dash-header__input"
            value={dataFim}
            onChange={(e) => onDataFimChange(e.target.value)}
            aria-label="Data final do período"
          />
          </label>
        </div>
        <button
          type="button"
          className="btn btn--primary dash-header__btn-atualizar"
          onClick={onAtualizar}
          disabled={atualizando}
          aria-label="Atualizar dados do dashboard"
        >
          {atualizando ? "Atualizando…" : "Atualizar"}
        </button>
      </div>
    </header>
  );
}

function CalendarIcon() {
  return (
    <svg className="dash-header__calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
