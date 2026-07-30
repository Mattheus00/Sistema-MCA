export function DashboardSkeleton() {
  return (
    <div className="dashboard dashboard--loading" aria-busy="true" aria-label="Carregando dashboard">
      <div className="dash-skeleton dash-skeleton--header" />
      <div className="dash-metrics">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dash-skeleton dash-skeleton--metric" />
        ))}
      </div>
      <div className="dash-grid-charts">
        <div className="dash-skeleton dash-skeleton--chart" />
        <div className="dash-skeleton dash-skeleton--chart" />
      </div>
      <div className="dash-grid-side">
        <div className="dash-skeleton dash-skeleton--card" />
        <div className="dash-skeleton dash-skeleton--card" />
      </div>
      <div className="dash-skeleton dash-skeleton--wide" />
    </div>
  );
}
