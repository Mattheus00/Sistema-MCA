import { MetricCard } from "@/components/dashboard/MetricCard";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChartIcon,
  WalletIcon,
} from "@/components/livro-caixa/LivroCaixaIcons";
import { formatarMoeda } from "@/lib/valorBrasil";
import type { LivroCaixaDashboard } from "@/types/livroCaixa";

type LivroCaixaMetricsProps = {
  dashboard: LivroCaixaDashboard | null;
  loadingDashboard: boolean;
};

export default function LivroCaixaMetrics({ dashboard, loadingDashboard }: LivroCaixaMetricsProps) {
  return (
    <>
      <div className="dash-metrics livro-caixa__metrics">
        <MetricCard
          icon={<WalletIcon />}
          label="Saldo realizado"
          value={dashboard ? formatarMoeda(dashboard.saldoRealizado) : "—"}
          hint={dashboard ? `Previsto: ${formatarMoeda(dashboard.saldoPrevisto)}` : undefined}
          hintTone="success"
          loading={loadingDashboard}
          iconTone="wallet"
        />
        <MetricCard
          icon={<ArrowUpIcon />}
          label="Entradas do mês"
          value={dashboard ? formatarMoeda(dashboard.entradasMes) : "—"}
          loading={loadingDashboard}
          iconTone="money"
        />
        <MetricCard
          icon={<ArrowDownIcon />}
          label="Saídas do mês"
          value={dashboard ? formatarMoeda(dashboard.saidasMes) : "—"}
          hintTone="warning"
          loading={loadingDashboard}
          iconTone="alert"
        />
        <MetricCard
          icon={<ChartIcon />}
          label="Resultado do mês"
          value={dashboard ? formatarMoeda(dashboard.resultadoMes) : "—"}
          loading={loadingDashboard}
          iconTone="purple"
        />
      </div>

      <div className="livro-caixa__saldo-duplo" aria-label="Comparativo de saldos">
        <div className="livro-caixa__saldo-item livro-caixa__saldo-item--realizado">
          <span>Saldo realizado</span>
          <strong>{dashboard ? formatarMoeda(dashboard.saldoRealizado) : "—"}</strong>
          <small>Movimentações já recebidas/pagas</small>
        </div>
        <div className="livro-caixa__saldo-item livro-caixa__saldo-item--previsto">
          <span>Saldo previsto</span>
          <strong>{dashboard ? formatarMoeda(dashboard.saldoPrevisto) : "—"}</strong>
          <small>Inclui contas a pagar e a receber</small>
        </div>
      </div>
    </>
  );
}
