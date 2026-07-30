import type { ReactNode } from "react";

type MetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  hintTone?: "neutral" | "success" | "warning" | "danger";
  loading?: boolean;
  iconTone?: "purple" | "alert" | "money" | "wallet";
};

export function MetricCard({
  icon,
  label,
  value,
  hint,
  hintTone = "neutral",
  loading,
  iconTone = "purple",
}: MetricCardProps) {
  return (
    <article className="dash-metric" aria-busy={loading}>
      <div className={`dash-metric__icon dash-metric__icon--${iconTone}`} aria-hidden="true">
        {icon}
      </div>
      <div className="dash-metric__body">
        <span className="dash-metric__label">{label}</span>
        {loading ? (
          <span className="dash-metric__skeleton" aria-label="Carregando" />
        ) : (
          <strong className="dash-metric__value">{value}</strong>
        )}
        {hint && !loading && (
          <span className={`dash-metric__hint dash-metric__hint--${hintTone}`}>{hint}</span>
        )}
      </div>
    </article>
  );
}
