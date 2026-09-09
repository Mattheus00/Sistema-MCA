import type { ReactNode } from "react";
import { InfoIcon } from "@/components/envio-boletos/EnvioBoletosIcons";

export default function ResumoCard({
  label,
  valor,
  tipo,
  tooltip,
  icon,
}: {
  label: string;
  valor: number;
  tipo: "roxo" | "verde" | "amarelo" | "laranja" | "cinza";
  tooltip: string;
  icon: ReactNode;
}) {
  return (
    <div className={`page-envio-boletos__stat page-envio-boletos__stat--${tipo}`}>
      <div className="page-envio-boletos__stat-head">
        <span className="page-envio-boletos__stat-label">{label}</span>
        <button
          type="button"
          className="page-envio-boletos__stat-info"
          title={tooltip}
          aria-label={tooltip}
        >
          <InfoIcon />
        </button>
      </div>
      <div className="page-envio-boletos__stat-body">
        <strong className="page-envio-boletos__stat-valor">{valor}</strong>
        <span
          className={`page-envio-boletos__stat-icon page-envio-boletos__stat-icon--${tipo}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
    </div>
  );
}
