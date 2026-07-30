type DashboardErrorStateProps = {
  onRetry: () => void;
};

export function DashboardErrorState({ onRetry }: DashboardErrorStateProps) {
  return (
    <div className="dash-error" role="alert">
      <h2>Não foi possível carregar o dashboard</h2>
      <p>Verifique sua conexão com o servidor e tente novamente.</p>
      <button type="button" className="btn btn--primary" onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  );
}
