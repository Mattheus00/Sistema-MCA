import { useState } from 'react'
import { DashboardErrorState } from '@/components/dashboard/DashboardErrorState'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { DebtEvolutionChart } from '@/components/dashboard/DebtEvolutionChart'
import { DelinquencyStatusCard } from '@/components/dashboard/DelinquencyStatusCard'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { RecentActivities } from '@/components/dashboard/RecentActivities'
import { ReceivablesChart } from '@/components/dashboard/ReceivablesChart'
import { primeiroDiaMes, hojeIso, formatarMoedaDashboard, formatarPercentualDashboard } from '@/lib/dashboardUtils'
import { useDashboardData, type PeriodoChart, type PeriodoEvolucao } from '@/hooks/useDashboardData'

export default function Dashboard() {
  const [periodoChart, setPeriodoChart] = useState<PeriodoChart>(30)
  const [periodoEvolucao, setPeriodoEvolucao] = useState<PeriodoEvolucao>(6)
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes)
  const [dataFim, setDataFim] = useState(hojeIso)

  const {
    loading,
    loadingChart,
    atualizando,
    erro,
    carregar,
    totalClientes,
    clientesInadimplentes,
    percentualInadimplentes,
    valorEmAberto,
    pagamentosRecebidos,
    evolucao,
    faixasInadimplencia,
    atividades,
    montante,
    inadimplentes,
  } = useDashboardData(periodoChart, periodoEvolucao, dataInicio, dataFim)

  if (loading && !atualizando) {
    return <DashboardSkeleton />
  }

  if (erro) {
    return (
      <div className="dashboard">
        <DashboardErrorState onRetry={() => carregar('atualizar')} />
      </div>
    )
  }

  return (
    <div className="dashboard">
      <DashboardHeader
        dataInicio={dataInicio}
        dataFim={dataFim}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onAtualizar={() => carregar('atualizar')}
        atualizando={atualizando}
      />

      <div className="dash-metrics">
        <MetricCard
          icon={<PeopleIcon />}
          label="Clientes ativos"
          value={totalClientes.toLocaleString('pt-BR')}
          loading={loading}
          iconTone="purple"
        />
        <MetricCard
          icon={<AlertIcon />}
          label="Inadimplentes"
          value={clientesInadimplentes.toLocaleString('pt-BR')}
          hint={
            percentualInadimplentes != null
              ? `${formatarPercentualDashboard(percentualInadimplentes)} do total de clientes`
              : undefined
          }
          hintTone="warning"
          loading={loading}
          iconTone="alert"
        />
        <MetricCard
          icon={<MoneyIcon />}
          label="Valor total em aberto"
          value={valorEmAberto != null ? formatarMoedaDashboard(valorEmAberto) : '—'}
          loading={loading}
          iconTone="money"
        />
        <MetricCard
          icon={<WalletIcon />}
          label="Pagamentos recebidos"
          value={pagamentosRecebidos != null ? formatarMoedaDashboard(pagamentosRecebidos) : '—'}
          hint={dataInicio && dataFim ? `Período: ${dataInicio.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')}` : undefined}
          loading={loading}
          iconTone="wallet"
        />
      </div>

      <div className="dash-grid-charts">
        <ReceivablesChart
          periodo={periodoChart}
          onPeriodoChange={setPeriodoChart}
          aReceber={montante.aReceber}
          recebido={montante.recebido}
          baixadoCancelado={montante.baixadoCancelado}
          loading={loadingChart}
        />
        <DebtEvolutionChart
          dados={evolucao}
          periodo={periodoEvolucao}
          onPeriodoChange={setPeriodoEvolucao}
          loading={loading}
          semDados={inadimplentes.length === 0}
        />
      </div>

      <div className="dash-grid-side">
        <DelinquencyStatusCard faixas={faixasInadimplencia} loading={loading} />
        <QuickActions />
      </div>

      <RecentActivities atividades={atividades} loading={loading} />
    </div>
  )
}

function PeopleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function MoneyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
